
# Tweak - AI Resume Optimization & Job Matching Web App

## Project Overview
Tweak is an AI-powered web application designed to optimize resumes, match them to job descriptions, and generate career action plans for job seekers. The application uses OpenAI's API for resume parsing, enhancement, and job description matching.

## Core Features

### Resume Optimization (Tweak Page)
- Upload resume (PDF, Word, or TXT format)
- AI-generated ATS Score (1-100)
- Automatic bullet point enhancement
- Job description matching
- One-click resume improvements
- Career action plan generation
- Resume download in Word/PDF format

### AI-Powered Cover Letter Generator
- Tailored cover letter generation
- Industry-specific tone adjustment
- Inline editing capabilities

### Resume Version Control and Dashboard
- Store up to 3 resumes (free tier)
- Version history tracking
- AI-powered version selection

### Job Match Score and Enhancement
- Job description analysis
- Match score calculation (1-100)
- Keyword gap analysis
- Targeted resume optimization

### Career Action Plan Generator
- Skill improvement recommendations
- Alternative role suggestions
- Interview preparation assistance

## Testing Instructions

### 1. Resume Upload & Analysis
1. Navigate to the upload page
2. Upload a resume in PDF, DOC, DOCX, or TXT format
3. Verify the ATS score appears
4. Check that the resume content is correctly parsed
5. Confirm formatting suggestions are displayed

### 2. Job Matching
1. Paste a job description
2. Verify match score calculation
3. Check keyword analysis
4. Test resume optimization suggestions
5. Confirm suggested improvements are relevant

### 3. Cover Letter Generation
1. Input job description
2. Generate cover letter
3. Test inline editing
4. Verify tone appropriateness
5. Test regeneration feature

### 4. Version Control
1. Upload multiple resume versions
2. Check version history
3. Test rollback functionality
4. Verify AI version selection
5. Confirm storage limits

### 5. Career Action Plan
1. Check recommendations for low match scores
2. Verify skill improvement suggestions
3. Test alternative role recommendations
4. Confirm interview preparation content
5. Verify action plan relevance

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Access the application at `http://localhost:5000`

## Environment Setup
The application requires the following environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: MongoDB connection string

## Testing Credentials
For testing purposes, use:
- Email: test@example.com
- Password: testpass123

## Known Limitations
- Free tier limited to 3 stored resumes
- PDF parsing may have limitations with complex layouts
- Job matching requires detailed job descriptions

## Troubleshooting
If you encounter issues:
1. Check console for error messages
2. Verify API key configuration
3. Confirm file format compatibility
4. Check network connectivity
5. Verify database connection

## Support
For issues or questions, please open a GitHub issue or contact support@tweakapp.com
