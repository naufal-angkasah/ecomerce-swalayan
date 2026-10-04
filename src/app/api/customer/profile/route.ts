import { NextResponse } from 'next/server';
import { getServerSupabase, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { CustomerAddress } from '@/types';
import { deduplicateAddresses } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase();
    const userId = searchParams.get('userId')?.trim();

    if (!isServerSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase server not configured' }, { status: 503 });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 503 });
    }

    let authUserId: string | null = null;

    if (userId) {
      const cleanId = userId.replace(/^usr-sb-/, '');
      authUserId = cleanId;
    }

    // If no valid UUID, look up user by email
    if (!authUserId && email) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const match = usersData?.users.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        authUserId = match.id;
      }
    }

    if (!authUserId) {
      return NextResponse.json({ profile: null, addresses: [] });
    }

    // Query profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUserId)
      .maybeSingle();

    // Query addresses
    const { data: addresses } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', authUserId)
      .order('is_default', { ascending: false });

    const rawMappedAddresses: CustomerAddress[] = (addresses || []).map((a) => ({
      id: a.id,
      label: a.label || 'Rumah',
      recipient_name: a.recipient_name,
      phone: a.phone,
      full_address: a.full_address,
      area_district: a.district || 'Kec. Banda Raya',
      city: a.city || 'Banda Aceh',
      postal_code: a.postal_code || '23117',
      delivery_notes: a.notes || undefined,
      is_primary: Boolean(a.is_default),
    }));

    const mappedAddresses = deduplicateAddresses(rawMappedAddresses);

    return NextResponse.json({
      profile: profile
        ? {
            id: profile.id,
            name: profile.full_name,
            email: profile.email,
            phone: profile.phone || '',
            birthdate: profile.date_of_birth || '',
            role: profile.role || 'customer',
          }
        : null,
      addresses: mappedAddresses,
    });
  } catch (error: any) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isServerSupabaseConfigured) {
      return NextResponse.json({ error: 'Supabase server not configured' }, { status: 503 });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 503 });
    }

    const body = await req.json();
    const { userId, email, name, phone, birthdate, addresses } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let authUserId: string | null = null;
    if (userId) {
      authUserId = userId.replace(/^usr-sb-/, '');
    }

    // Ensure we have the user UUID in auth.users
    const { data: usersData } = await supabase.auth.admin.listUsers();
    let authUser = usersData?.users.find(
      (u) => (authUserId && u.id === authUserId) || u.email?.toLowerCase() === cleanEmail
    );

    if (!authUser) {
      // Create user in auth.users so foreign key constraint on profiles.id passes
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: `AlvinPass_${Date.now()}!`,
        email_confirm: true,
        user_metadata: { full_name: name || cleanEmail.split('@')[0] },
      });
      if (createErr || !created?.user) {
        console.error('Failed to create auth user:', createErr);
      } else {
        authUser = created.user;
      }
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Could not resolve auth user ID' }, { status: 400 });
    }

    authUserId = authUser.id;

    // 1. Upsert Profile
    const profilePayload: any = {
      id: authUserId,
      full_name: name || authUser.user_metadata?.full_name || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'customer',
      updated_at: new Date().toISOString(),
    };
    if (phone) profilePayload.phone = phone;
    if (birthdate) profilePayload.date_of_birth = birthdate;

    const { error: profileErr } = await supabase.from('profiles').upsert(profilePayload);
    if (profileErr) {
      console.error('Error upserting profile in Supabase:', profileErr);
    }

    // 2. Synchronize Addresses
    if (Array.isArray(addresses)) {
      // Deduplicate addresses before saving to prevent duplicate database rows
      const cleanAddresses = deduplicateAddresses(addresses);

      // Delete existing addresses for user
      await supabase.from('addresses').delete().eq('user_id', authUserId);

      if (cleanAddresses.length > 0) {
        const addressRows = cleanAddresses.map((a: CustomerAddress, idx: number) => ({
          user_id: authUserId,
          label: a.label || 'Rumah',
          recipient_name: a.recipient_name || name || 'Pelanggan',
          phone: a.phone || phone || '',
          province: 'Aceh',
          city: a.city || 'Banda Aceh',
          district: a.area_district || 'Kec. Banda Raya',
          postal_code: a.postal_code || '23117',
          full_address: a.full_address,
          notes: a.delivery_notes || a.notes || null,
          is_default: Boolean(a.is_primary ?? a.is_default ?? (idx === 0)),
          updated_at: new Date().toISOString(),
        }));

        const { error: addrErr } = await supabase.from('addresses').insert(addressRows);
        if (addrErr) {
          console.error('Error inserting addresses into Supabase:', addrErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      authUserId,
      message: 'Data profil dan alamat berhasil disinkronkan ke database Supabase',
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/profile:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
