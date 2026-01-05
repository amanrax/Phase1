const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '../android/app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');

// Increment versionCode
const versionCodeMatch = gradle.match(/versionCode (\d+)/);
if (versionCodeMatch) {
  const currentCode = parseInt(versionCodeMatch[1]);
  const newCode = currentCode + 1;
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${newCode}`);
  
  console.log(`✅ versionCode: ${currentCode} → ${newCode}`);
}

// Increment versionName (patch version)
const versionNameMatch = gradle.match(/versionName "(\d+)\.(\d+)\.(\d+)"/);
if (versionNameMatch) {
  const major = versionNameMatch[1];
  const minor = versionNameMatch[2];
  const patch = parseInt(versionNameMatch[3]) + 1;
  const newVersion = `${major}.${minor}.${patch}`;
  
  gradle = gradle.replace(
    /versionName "\d+\.\d+\.\d+"/,
    `versionName "${newVersion}"`
  );
  
  console.log(`✅ versionName: ${versionNameMatch[0]} → "${newVersion}"`);
}

fs.writeFileSync(gradlePath, gradle);
console.log('\n✅ Version bumped successfully!\n');
