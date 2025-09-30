#!/usr/bin/env node

/**
 * Quick Setup Script for Testing Authentication
 * 
 * This script helps you test the authentication system with sample data.
 * Run this after setting up your Supabase database according to SUPABASE_SETUP.md
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Please set up your .env.local file with Supabase credentials');
  console.log('Required variables:');
  console.log('- REACT_APP_SUPABASE_URL');
  console.log('- REACT_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestData() {
  console.log('🚀 Setting up test data...\n');

  // Check if user_roles table exists
  const { data: tableExists, error: tableError } = await supabase
    .from('user_roles')
    .select('*')
    .limit(1);

  if (tableError && tableError.code === '42P01') {
    console.log('❌ user_roles table not found. Please run the SQL commands from SUPABASE_SETUP.md first.');
    return;
  }

  // Add some sample games if notes table is empty
  const { data: existingNotes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .limit(1);

  if (!notesError && existingNotes.length === 0) {
    console.log('📦 Adding sample games...');
    
    const sampleGames = [
      {
        name: 'The Last of Us Part II',
        description: 'PlayStation 5',
        genre: 'Action-Adventure',
        release_date: '2020-06-19',
        players: 1,
        publisher: 'Sony Interactive Entertainment'
      },
      {
        name: 'Spider-Man: Miles Morales',
        description: 'PlayStation 5',
        genre: 'Action',
        release_date: '2020-11-12',
        players: 1,
        publisher: 'Sony Interactive Entertainment'
      },
      {
        name: 'Gran Turismo 7',
        description: 'PlayStation 5',
        genre: 'Racing',
        release_date: '2022-03-04',
        players: 2,
        publisher: 'Sony Interactive Entertainment'
      }
    ];

    const { error: insertError } = await supabase
      .from('notes')
      .insert(sampleGames);

    if (insertError) {
      console.log('❌ Error adding sample games:', insertError.message);
    } else {
      console.log('✅ Sample games added successfully!');
    }
  }

  console.log('\n🎮 Setup complete! Here\'s what you can do:');
  console.log('');
  console.log('1. Start your app: npm start');
  console.log('2. Create a new account or sign in');
  console.log('3. Build your personal game library:');
  console.log('   - Add games you own');
  console.log('   - Edit game details');
  console.log('   - Delete games from your collection');
  console.log('   - Each user has their own private library');
  console.log('');
  console.log('4. Optional admin features:');
  console.log('   - Sign up with: admin@gamelib.com');
  console.log('   - Then run SQL to make admin: UPDATE user_roles SET role = \'admin\' WHERE user_id = (SELECT id FROM auth.users WHERE email = \'admin@gamelib.com\');');
  console.log('');
  console.log('📋 Next steps:');
  console.log('- Follow the setup instructions in SUPABASE_SETUP.md');
  console.log('- Add the user_id column to your notes table');
  console.log('- Set up Row Level Security policies');
  console.log('- Customize the styling to match your brand');
}

setupTestData().catch(console.error);