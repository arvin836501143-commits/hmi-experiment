import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bfioqaesahvwvxzfiezs.supabase.co'
const supabaseAnonKey = 'sb_publishable_71qJo0P_zvkeQD7c2ti4BA_kshl2zHg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
