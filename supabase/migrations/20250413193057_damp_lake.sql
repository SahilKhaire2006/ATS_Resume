/*
  # Create resume database schema

  1. New Tables
    - `resumes` - Main resume information
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text)
      - `phone` (text)
      - `location` (text)
      - `linkedin` (text)
      - `website` (text)
      - `summary` (text)
      - `skills` (text array)
      - `created_at` (timestamptz)
    
    - `resume_experiences` - Work experience entries
      - `id` (uuid, primary key)
      - `resume_id` (uuid, foreign key to resumes.id)
      - `company` (text, not null)
      - `position` (text, not null)
      - `start_date` (text)
      - `end_date` (text)
      - `description` (text)
      - `order_index` (integer)
    
    - `resume_education` - Education entries
      - `id` (uuid, primary key)
      - `resume_id` (uuid, foreign key to resumes.id)
      - `institution` (text, not null)
      - `degree` (text, not null)
      - `field_of_study` (text)
      - `start_date` (text)
      - `end_date` (text)
      - `description` (text)
      - `order_index` (integer)
    
    - `resume_certifications` - Certification entries
      - `id` (uuid, primary key)
      - `resume_id` (uuid, foreign key to resumes.id)
      - `name` (text, not null)
      - `issuer` (text)
      - `date` (text)
      - `description` (text)
      - `order_index` (integer)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since we're not implementing auth in this example)
*/

-- Create the main resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  location text,
  linkedin text,
  website text,
  summary text,
  skills text[],
  created_at timestamptz DEFAULT now()
);

-- Create the resume_experiences table
CREATE TABLE IF NOT EXISTS resume_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE,
  company text NOT NULL,
  position text NOT NULL,
  start_date text,
  end_date text,
  description text,
  order_index integer,
  created_at timestamptz DEFAULT now()
);

-- Create the resume_education table
CREATE TABLE IF NOT EXISTS resume_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE,
  institution text NOT NULL,
  degree text NOT NULL,
  field_of_study text,
  start_date text,
  end_date text,
  description text,
  order_index integer,
  created_at timestamptz DEFAULT now()
);

-- Create the resume_certifications table
CREATE TABLE IF NOT EXISTS resume_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  date text,
  description text,
  order_index integer,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_certifications ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public access to resumes"
  ON resumes
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Allow public access to resume_experiences"
  ON resume_experiences
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Allow public access to resume_education"
  ON resume_education
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Allow public access to resume_certifications"
  ON resume_certifications
  FOR ALL
  TO public
  USING (true);