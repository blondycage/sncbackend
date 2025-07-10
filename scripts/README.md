# Database Seeding Scripts

This directory contains scripts for seeding the database with sample data for development and testing purposes.

## Job Seeding Script

### Overview
The `seedJobs.js` script clears existing job data and populates the database with realistic sample job postings for the North Cyprus job platform.

### Features
- **Clears existing jobs**: Removes all current job postings from the database
- **Creates diverse job listings**: Adds 12 different job postings across various industries
- **Auto-approved jobs**: All seeded jobs are automatically approved for immediate visibility
- **Realistic data**: Includes proper company information, salary ranges, requirements, and benefits
- **Multiple locations**: Jobs distributed across Kyrenia, Nicosia, and Famagusta
- **Various job types**: Full-time, part-time, contract, freelance, and internship positions
- **Different work locations**: On-site, remote, and hybrid options

### Usage

#### Run the full seeding process (clear + seed):
```bash
npm run jobs:seed
```

#### Only clear existing jobs:
```bash
npm run jobs:clear
```

#### Manual execution:
```bash
node scripts/seedJobs.js
```

### Sample Job Categories Included

1. **Technology**
   - Senior Software Engineer
   - Web Developer Intern
   - Digital Marketing Specialist

2. **Finance & Business**
   - Financial Analyst
   - Marketing Manager
   - Accounting Clerk

3. **Hospitality & Tourism**
   - Hotel Front Desk Supervisor
   - Restaurant Manager
   - Tourism Sales Representative

4. **Education**
   - English Teacher

5. **Creative & Design**
   - Graphic Designer

6. **Engineering & Construction**
   - Civil Engineer

### Job Data Structure

Each seeded job includes:
- **Basic Information**: Title, role, detailed description
- **Salary Details**: Min/max range, currency (USD), frequency (monthly)
- **Job Specifications**: Type (full-time/part-time/etc.), work location (on-site/remote/hybrid)
- **Requirements**: Detailed list of qualifications and experience needed
- **Benefits**: Comprehensive benefits packages
- **Company Information**: Name, website, description
- **Location**: City and region within North Cyprus
- **Contact Information**: Email and phone number
- **Application Deadline**: 30 days from seeding date
- **Moderation Status**: Auto-approved for immediate visibility

### Database Requirements

- MongoDB connection must be configured in `.env` file
- `MONGODB_URI` environment variable must be set
- User model must exist for creating dummy job poster

### Dummy User Creation

The script automatically creates a dummy admin user for posting jobs:
- **Username**: jobseeder
- **Email**: admin@seedjobs.com
- **Role**: admin
- **Status**: Active and verified

### Output Information

The script provides detailed console output including:
- Connection status
- Number of jobs cleared
- Number of jobs created
- Summary statistics (job types, locations, work arrangements)
- Sample of created jobs
- Success/error messages

### Error Handling

The script includes comprehensive error handling for:
- Database connection issues
- Data validation errors
- Duplicate key constraints
- User creation failures

### Development Notes

- Jobs are automatically approved (`moderationStatus: 'approved'`)
- Random view counts (50-549) and application counts (0-14) are assigned
- Creation dates are randomized within the last 7 days
- All contact emails are fictional for demo purposes
- Phone numbers follow North Cyprus format (+90 392)

### Customization

To add more jobs or modify existing ones:
1. Edit the `sampleJobs` array in `seedJobs.js`
2. Follow the existing data structure
3. Ensure all required fields are included
4. Update salary ranges to reflect current market rates
5. Verify company and contact information

### Related Scripts

- `seed.js` - General database seeding (if exists)
- `clearDB.js` - Complete database clearing (if exists)

### Environment Variables Required

```env
MONGODB_URI=your_mongodb_connection_string
```

### Dependencies

- mongoose
- colors (for console output styling)
- dotenv 