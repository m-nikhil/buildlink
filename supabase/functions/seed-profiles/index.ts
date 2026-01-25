import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const testProfiles = [
  {
    full_name: "Sarah Chen",
    headline: "Product Manager at TechCorp",
    bio: "Passionate about building products that make a difference. Looking to connect with founders and engineers.",
    location: "San Francisco, CA",
    age: 28,
    experience_level: "mid",
    industry: "tech",
    looking_for: ["networking", "collaboration"],
    skills: ["Product Management", "Agile", "User Research", "Roadmapping"],
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
  },
  {
    full_name: "Marcus Johnson",
    headline: "Senior Software Engineer",
    bio: "Full-stack developer with 8 years experience. Love mentoring junior devs and exploring new technologies.",
    location: "Austin, TX",
    age: 32,
    experience_level: "senior",
    industry: "tech",
    looking_for: ["mentorship", "networking"],
    skills: ["React", "Node.js", "Python", "AWS", "System Design"],
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
  },
  {
    full_name: "Emily Rodriguez",
    headline: "Marketing Director | Growth Expert",
    bio: "Helping startups scale through data-driven marketing strategies. Open to advisory roles.",
    location: "New York, NY",
    age: 35,
    experience_level: "senior",
    industry: "marketing",
    looking_for: ["collaboration", "hiring"],
    skills: ["Growth Marketing", "SEO", "Content Strategy", "Analytics"],
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
  },
  {
    full_name: "David Kim",
    headline: "Startup Founder | Ex-Google",
    bio: "Building the future of remote work. Always excited to meet fellow entrepreneurs and investors.",
    location: "Seattle, WA",
    age: 30,
    experience_level: "senior",
    industry: "tech",
    looking_for: ["networking", "hiring"],
    skills: ["Entrepreneurship", "Leadership", "Product Strategy", "Fundraising"],
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
  },
  {
    full_name: "Priya Patel",
    headline: "UX Designer | Design Systems",
    bio: "Creating intuitive experiences for millions of users. Passionate about accessibility and inclusive design.",
    location: "Los Angeles, CA",
    age: 27,
    experience_level: "mid",
    industry: "tech",
    looking_for: ["collaboration", "job_seeking"],
    skills: ["UI/UX Design", "Figma", "Design Systems", "User Testing"],
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
  },
  {
    full_name: "James Wilson",
    headline: "VP of Engineering",
    bio: "Building and scaling engineering teams. Happy to mentor aspiring tech leaders.",
    location: "Boston, MA",
    age: 42,
    experience_level: "executive",
    industry: "tech",
    looking_for: ["mentorship", "networking"],
    skills: ["Engineering Management", "Architecture", "Team Building", "Strategy"],
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
  },
  {
    full_name: "Lisa Thompson",
    headline: "Healthcare Innovation Lead",
    bio: "Bridging technology and healthcare. Looking for collaborators in digital health space.",
    location: "Chicago, IL",
    age: 38,
    experience_level: "senior",
    industry: "healthcare",
    looking_for: ["collaboration", "networking"],
    skills: ["Healthcare Tech", "Innovation", "Strategy", "Partnerships"],
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
  },
  {
    full_name: "Alex Rivera",
    headline: "Junior Developer | Bootcamp Grad",
    bio: "Recently transitioned into tech. Eager to learn and grow with guidance from experienced mentors.",
    location: "Denver, CO",
    age: 25,
    experience_level: "entry",
    industry: "tech",
    looking_for: ["mentorship", "job_seeking"],
    skills: ["JavaScript", "React", "CSS", "Git"],
    avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400",
  },
  {
    full_name: "Michelle Lee",
    headline: "Finance Manager | Fintech Enthusiast",
    bio: "Combining traditional finance with modern technology. Interested in crypto and DeFi projects.",
    location: "Miami, FL",
    age: 33,
    experience_level: "mid",
    industry: "finance",
    looking_for: ["networking", "collaboration"],
    skills: ["Financial Analysis", "Fintech", "Risk Management", "Strategy"],
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
  },
  {
    full_name: "Chris Anderson",
    headline: "EdTech Consultant",
    bio: "Helping educational institutions embrace technology. Building the future of learning.",
    location: "Portland, OR",
    age: 40,
    experience_level: "senior",
    industry: "education",
    looking_for: ["collaboration", "hiring"],
    skills: ["EdTech", "Curriculum Design", "LMS", "Training"],
    avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
  },
];

async function getFirebaseAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  }
  
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${claimB64}`;

  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }

  return tokenData.access_token;
}

function generateId(): string {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID not configured');
    }

    const accessToken = await getFirebaseAccessToken();
    const now = new Date().toISOString();
    const createdProfiles: string[] = [];

    for (const profile of testProfiles) {
      const docId = generateId();
      const docData = {
        fields: {
          id: { stringValue: docId },
          user_id: { stringValue: docId },
          full_name: { stringValue: profile.full_name },
          email: { stringValue: `${profile.full_name.toLowerCase().replace(' ', '.')}@test.com` },
          avatar_url: { stringValue: profile.avatar_url },
          headline: { stringValue: profile.headline },
          bio: { stringValue: profile.bio },
          linkedin_url: { nullValue: null },
          location: { stringValue: profile.location },
          age: { integerValue: profile.age.toString() },
          experience_level: { stringValue: profile.experience_level },
          industry: { stringValue: profile.industry },
          looking_for: { 
            arrayValue: { 
              values: profile.looking_for.map(g => ({ stringValue: g })) 
            } 
          },
          skills: { 
            arrayValue: { 
              values: profile.skills.map(s => ({ stringValue: s })) 
            } 
          },
          preferred_experience_levels: { arrayValue: { values: [] } },
          preferred_industries: { arrayValue: { values: [] } },
          preferred_goals: { arrayValue: { values: [] } },
          age_min: { nullValue: null },
          age_max: { nullValue: null },
          created_at: { stringValue: now },
          updated_at: { stringValue: now },
          last_active: { stringValue: now },
        }
      };

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/profiles?documentId=${docId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docData),
      });

      if (response.ok) {
        createdProfiles.push(profile.full_name);
      } else {
        const error = await response.text();
        console.error(`Failed to create ${profile.full_name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${createdProfiles.length} test profiles`,
        profiles: createdProfiles 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed profiles error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
