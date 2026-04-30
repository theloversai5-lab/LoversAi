// test-import.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Current directory:', __dirname);

try {
  const modulePath = join(__dirname, 'planner', 'ai_tools', 'retexturing.js');
  console.log('Looking for module at:', modulePath);
  
  const retexturing = await import(modulePath);
  console.log('✅ Import successful!');
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Full error:', error);
}