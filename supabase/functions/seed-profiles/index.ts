import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const seedProfiles = [
  { full_name: 'Sarah Chen', email: 'sarah.chen@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', headline: 'Product Manager at TechCorp', bio: 'Passionate about building user-centric products. 8 years in tech, love mentoring aspiring PMs.', location: 'San Francisco, CA', experience_level: 'senior', industry: 'tech', looking_for: ['mentorship', 'networking'], looking_for_text: 'Seeking to mentor early-career PMs and connect with other product leaders to share insights on building great products.', skills: ['Product Strategy', 'Agile', 'User Research', 'Data Analysis'], age: 32, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'Marcus Johnson', email: 'marcus.j@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', headline: 'Senior Software Engineer', bio: 'Full-stack developer with a passion for clean code and scalable systems. Open to collaboration on interesting projects.', location: 'Austin, TX', experience_level: 'senior', industry: 'tech', looking_for: ['collaboration', 'networking'], looking_for_text: 'Looking to collaborate on open-source projects and connect with engineers working on distributed systems.', skills: ['React', 'Node.js', 'Python', 'AWS', 'System Design'], age: 29, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'Emily Rodriguez', email: 'emily.r@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', headline: 'Marketing Director', bio: 'Building brands that resonate. 10+ years in B2B marketing. Looking to connect with fellow marketers and founders.', location: 'New York, NY', experience_level: 'executive', industry: 'marketing', looking_for: ['networking', 'mentorship'], looking_for_text: 'Interested in connecting with startup founders who need go-to-market advice and fellow marketing executives.', skills: ['Brand Strategy', 'Content Marketing', 'SEO', 'Analytics'], age: 38, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'David Kim', email: 'david.kim@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', headline: 'Startup Founder & CEO', bio: 'Serial entrepreneur. Built and sold 2 companies. Now building the future of fintech.', location: 'Seattle, WA', experience_level: 'executive', industry: 'finance', looking_for: ['hiring', 'networking'], looking_for_text: 'Actively hiring senior engineers and designers. Also happy to connect with other founders and investors.', skills: ['Fundraising', 'Leadership', 'Fintech', 'Strategy'], age: 42, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'Priya Patel', email: 'priya.p@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', headline: 'UX Designer', bio: 'Creating delightful user experiences. Seeking mentorship opportunities and collaboration on impactful projects.', location: 'Los Angeles, CA', experience_level: 'mid', industry: 'tech', looking_for: ['mentorship', 'collaboration'], looking_for_text: 'Would love to find a design mentor and work on side projects that have real social impact.', skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'], age: 27, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'James Wilson', email: 'james.w@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', headline: 'Data Scientist', bio: 'ML enthusiast turning data into insights. Looking to connect with product teams and fellow data professionals.', location: 'Boston, MA', experience_level: 'mid', industry: 'tech', looking_for: ['collaboration', 'job_seeking'], looking_for_text: 'Exploring ML engineering roles at mission-driven companies. Open to collaborating on interesting data projects.', skills: ['Python', 'Machine Learning', 'SQL', 'TensorFlow'], age: 31, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'Lisa Thompson', email: 'lisa.t@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', headline: 'Healthcare Consultant', bio: 'Helping healthcare organizations transform digitally. Passionate about improving patient outcomes.', location: 'Chicago, IL', experience_level: 'senior', industry: 'healthcare', looking_for: ['networking', 'collaboration'], looking_for_text: 'Looking to connect with health-tech founders and other consultants in the digital health space.', skills: ['Healthcare IT', 'Project Management', 'Change Management', 'HIPAA'], age: 35, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'Alex Rivera', email: 'alex.r@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', headline: 'Junior Developer', bio: 'Recent bootcamp grad eager to learn and grow. Looking for mentorship and entry-level opportunities.', location: 'Denver, CO', experience_level: 'entry', industry: 'tech', looking_for: ['mentorship', 'job_seeking'], looking_for_text: 'Seeking a patient mentor who can help me grow as a developer. Open to junior roles and internships.', skills: ['JavaScript', 'React', 'CSS', 'Git'], age: 24, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'Nicole Zhang', email: 'nicole.z@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', headline: 'Financial Analyst', bio: 'Numbers tell stories. 5 years in investment banking, now exploring fintech opportunities.', location: 'San Francisco, CA', experience_level: 'mid', industry: 'finance', looking_for: ['networking', 'job_seeking'], looking_for_text: 'Interested in fintech product roles that combine my finance background with technology. Love meeting other career changers.', skills: ['Financial Modeling', 'Valuation', 'Excel', 'Bloomberg'], age: 28, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
  { full_name: 'Michael Brown', email: 'michael.b@buildlink.test', avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', headline: 'Education Technology Lead', bio: 'Reimagining how we learn. Building tools that make education accessible to everyone.', location: 'Portland, OR', experience_level: 'senior', industry: 'education', looking_for: ['hiring', 'collaboration'], looking_for_text: 'Hiring curriculum designers and engineers passionate about education. Also seeking partnerships with schools.', skills: ['EdTech', 'Curriculum Design', 'LMS', 'Instructional Design'], age: 36, linkedin_url: 'https://www.linkedin.com/in/nikhilmahendran/' },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];

    for (const profile of seedProfiles) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: profile.email,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      if (authError) {
        results.push({ email: profile.email, status: 'error', message: authError.message });
        continue;
      }

      const userId = authData.user.id;

      // Create profile with is_seed flag
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        user_id: userId,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        experience_level: profile.experience_level,
        industry: profile.industry,
        looking_for: profile.looking_for,
        looking_for_text: profile.looking_for_text,
        skills: profile.skills,
        age: profile.age,
        linkedin_url: profile.linkedin_url,
        is_seed: true,
      });

      if (profileError) {
        results.push({ email: profile.email, status: 'partial', message: `User created but profile failed: ${profileError.message}` });
      } else {
        results.push({ email: profile.email, status: 'success' });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
