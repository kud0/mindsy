#!/usr/bin/env node

// Manual user upgrade script
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function upgradeUser(userId, email = null) {
  try {
    console.log(`🔄 Upgrading user: ${userId}`);
    
    // Check if user exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError.message);
      
      if (email) {
        console.log(`🔍 Trying to find user by email: ${email}`);
        const { data: profileByEmail, error: emailError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single();
          
        if (emailError) {
          console.error('❌ Error finding user by email:', emailError.message);
          return;
        }
        
        if (profileByEmail) {
          console.log('✅ Found user by email:', profileByEmail.id);
          return upgradeUser(profileByEmail.id);
        }
      }
      return;
    }
    
    if (!existingProfile) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('👤 Current user profile:', {
      id: existingProfile.id,
      email: existingProfile.email,
      tier: existingProfile.subscription_tier
    });
    
    if (existingProfile.subscription_tier === 'student') {
      console.log('ℹ️  User is already on Student tier');
      return;
    }
    
    // Upgrade to Student tier
    const { data, error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'student',
        stripe_customer_id: 'cus_SmUASaDEhnu9xK', // From webhook payload
        subscription_period_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error('❌ Error upgrading user:', error.message);
      return;
    }
    
    console.log('✅ Successfully upgraded user to Student tier!');
    console.log('Updated profile:', data[0]);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Get user ID from command line or use the one from webhook payload
const userId = process.argv[2] || '3c684689-f3a2-4822-a72c-323b195a8b32';
const email = process.argv[3] || 'rerererere@rerere.ere';

upgradeUser(userId, email);