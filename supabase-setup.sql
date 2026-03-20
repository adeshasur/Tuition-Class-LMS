-- Tuition Class MVP Database Setup
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_admin column if not exists (for existing tables)
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Create materials table
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('link', 'pdf')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slip_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy for users - allow read for all authenticated users
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete users" ON users
    FOR DELETE USING (true);

-- Policy for materials - allow read for all
CREATE POLICY "Anyone can view materials" ON materials
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert materials" ON materials
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete materials" ON materials
    FOR DELETE USING (true);

-- Policy for payments
CREATE POLICY "Anyone can insert payments" ON payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (true);

CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (true);

CREATE POLICY "Admins can update payments" ON payments
    FOR UPDATE USING (true);

-- Create admin user
INSERT INTO users (name, mobile, pin, status, is_admin)
VALUES ('Admin', '0712345678', '1234', 'active', true);

-- Storage bucket setup (run these in Supabase Dashboard > Storage)
-- 1. Create bucket: payment-slips (public)
-- 2. Create bucket: tutes (public)

-- Storage policies
CREATE POLICY "Anyone can upload to payment-slips" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "Anyone can view payment-slips" ON storage.objects
    FOR SELECT USING (bucket_id = 'payment-slips');

CREATE POLICY "Admins can delete from payment-slips" ON storage.objects
    FOR DELETE USING (bucket_id = 'payment-slips');

CREATE POLICY "Anyone can upload to tutes" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'tutes');

CREATE POLICY "Anyone can view tutes" ON storage.objects
    FOR SELECT USING (bucket_id = 'tutes');

CREATE POLICY "Admins can delete from tutes" ON storage.objects
    FOR DELETE USING (bucket_id = 'tutes');
