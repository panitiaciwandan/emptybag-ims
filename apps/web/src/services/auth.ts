import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) return null

  return {
    ...data,
    email: user.email ?? undefined
  } as UserProfile
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

export async function updateProfile(profile: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('users')
    .update(profile)
    .eq('id', profile.id!)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .order('full_name')
  if (error) throw error
  return data as UserProfile[]
}

export async function createUser(profile: Omit<UserProfile, 'id'>) {
  const { data, error } = await supabase.from('users').insert(profile).select().single()
  if (error) throw error
  return data
}

export async function updateUser(id: string, patch: Partial<UserProfile>) {
  const { data, error } = await supabase.from('users').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
