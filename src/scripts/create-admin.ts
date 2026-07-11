import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { connectDatabase, disconnectDatabase } from '../database';
import { AdminRepository } from '../modules/admin/admin.repository';
import * as passwordUtil from '../modules/auth/password';

async function main() {
  const rl = readline.createInterface({ input, output });

  let username: string;
  let password: string;

  try {
    username = await rl.question('Username: ');
    password = await rl.question('Password: ');
  } finally {
    rl.close();
  }

  const trimmedUsername = username.trim().toLowerCase();
  if (!trimmedUsername) {
    // eslint-disable-next-line no-console
    console.error('Error: Username cannot be empty.');
    process.exit(1);
  }
  if (password.length < 8) {
    // eslint-disable-next-line no-console
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('Connecting to database...');
  await connectDatabase();

  try {
    const adminRepository = new AdminRepository();

    // Check if user already exists
    const existing = await adminRepository.findByUsername(trimmedUsername);
    if (existing) {
      // eslint-disable-next-line no-console
      console.error(`Error: Admin user '${trimmedUsername}' already exists.`);
      await disconnectDatabase();
      process.exit(1);
    }

    // Hash password
    const passwordHash = await passwordUtil.hash(password);

    // Create admin
    await adminRepository.create({ username: trimmedUsername, passwordHash });

    // eslint-disable-next-line no-console
    console.log(`Success: Admin user '${trimmedUsername}' created successfully.`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('An unexpected error occurred:', error);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
