import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oehdkvelzjaahddsuivz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jGDj5i2XTvo2ADwGcUzfSg_xliD2TiP";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
