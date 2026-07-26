const fs = require('fs');

// 1 & 2: auth.service.ts
let auth = fs.readFileSync('src/modules/auth/auth.service.ts', 'utf8');
auth = auth.replace(/organizationSchools = \(await/g, "organizationSchools = await");
auth = auth.replace(/let organizationSchools: any\[\] = \[\];/g, "let organizationSchools: any = undefined;");
fs.writeFileSync('src/modules/auth/auth.service.ts', auth, 'utf8');

// 3: organizations.service.ts
let org = fs.readFileSync('src/modules/organizations/organizations.service.ts', 'utf8');
org = org.replace(/this\.configService\.get<string>\('SUPABASE_SERVICE_ROLE_KEY'\)/g, "this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') as string");
fs.writeFileSync('src/modules/organizations/organizations.service.ts', org, 'utf8');

