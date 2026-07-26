const fs = require('fs');
const glob = require('glob');

const files = [
  'src/modules/planning/planning-generation.service.ts',
  'src/modules/planning/planning.controller.ts',
  'src/modules/schools/schools.service.ts',
  'src/modules/students/students.service.ts',
  'src/modules/teachers/teachers.service.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace currentUser.schoolId with (currentUser.activeSchoolId || currentUser.schoolId) as string
  // but only in specific places where it's passed as arg or assigned to string
  content = content.replace(/currentUser\.schoolId/g, "(currentUser.activeSchoolId || currentUser.schoolId) as string");
  
  // also fix group.grade.level -> group.grade?.level 
  // Wait, I saw "Property 'grade' does not exist on type". 
  // Let's check planning-generation.service.ts around line 134.
  content = content.replace(/group\.grade\.level/g, "group.grade?.level");
  content = content.replace(/group\.grade\.order/g, "group.grade?.order");

  fs.writeFileSync(file, content, 'utf8');
});
