# Migration Guide: Amplify to Netlify + Supabase

## Prerequisites
1. Create a Supabase account at https://supabase.com
2. Create a new Supabase project
3. Install Supabase dependencies: `npm install @supabase/supabase-js`

## Step 1: Database Setup in Supabase
1. Go to your Supabase project dashboard
2. Navigate to Table Editor
3. Create a "notes" table with the following columns:
   - id (int8, primary key, auto-increment)
   - name (text, not null)
   - description (text)
   - genre (text)
   - release_date (date)
   - players (int4)
   - publisher (text)
   - image (text)
   - created_at (timestamptz, default now())
   - updated_at (timestamptz, default now())

## Step 2: Replace AWS Amplify with Supabase

### Update src/index.js
Replace:
```javascript
import Amplify from 'aws-amplify';
import config from './aws-exports';
Amplify.configure(config);
```

With:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Update App.js
Replace AWS Amplify imports with Supabase:
```javascript
// Remove these imports
import { Authenticator } from '@aws-amplify/ui-react';
import { API, Storage } from 'aws-amplify';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation} from './graphql/mutations';

// Add this import
import { supabase } from './index';
```

### Replace API calls:

**Fetch Notes:**
```javascript
async function fetchNotes() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching notes:', error);
    return;
  }
  
  // Handle image URLs if using Supabase Storage
  const notesWithImages = await Promise.all(notes.map(async (note) => {
    if (note.image) {
      const { data } = supabase.storage.from('images').getPublicUrl(note.image);
      note.image = data.publicUrl;
    }
    return note;
  }));
  
  setNotes(notesWithImages);
}
```

**Create Note:**
```javascript
async function createNote() {
  if (!formData.name || !formData.description) return;
  
  const { data, error } = await supabase
    .from('notes')
    .insert([
      {
        name: formData.name,
        description: formData.description,
        genre: formData.genre,
        release_date: formData.releaseDate,
        players: parseInt(formData.players),
        publisher: formData.publisher,
        image: formData.image
      }
    ])
    .select();
    
  if (error) {
    console.error('Error creating note:', error);
    return;
  }
  
  setNotes([...notes, data[0]]);
  setFormData(initialFormState);
}
```

**File Upload:**
```javascript
async function onChange(e) {
  if (!e.target.files[0]) return;
  
  const file = e.target.files[0];
  const fileName = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, file);
    
  if (error) {
    console.error('Error uploading file:', error);
    return;
  }
  
  setFormData({ ...formData, image: fileName });
  fetchNotes();
}
```

## Step 3: Authentication with Supabase
Replace the Authenticator component with Supabase Auth:

```javascript
// Add to App.js
import { useEffect, useState } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginComponent />;
  }

  // Your existing app JSX...
}
```

## Step 4: Environment Variables
Create a `.env` file in your project root:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 5: Netlify Deployment
1. Push your changes to Git
2. Connect your repository to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy!

## Step 6: Storage Setup in Supabase
1. Go to Storage in Supabase dashboard
2. Create a new bucket called "images"
3. Set up RLS policies for public access

SQL for public access policy:
```sql
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
```