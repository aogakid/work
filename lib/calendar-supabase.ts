import { createClient } from "@supabase/supabase-js"

// This publishable client key is intended for browser use. Access remains
// governed by the project's Supabase policies; never put a service key here.
const CALENDAR_SUPABASE_URL = "https://ncbheiqtybxptfdtikut.supabase.co"
const CALENDAR_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zWllddt4rUrbZNQqj2U9aQ_TmOEJu87"

const calendarSupabase = createClient(CALENDAR_SUPABASE_URL, CALENDAR_SUPABASE_PUBLISHABLE_KEY)

export default calendarSupabase
