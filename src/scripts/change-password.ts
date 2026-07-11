import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { connectDatabase, disconnectDatabase } from '../database';
import { AdminRepository } from '../modules/admin/admin.repository';
import * as passwordUtil from '../modules/auth/password';

async function main() {
  const rl = readline.createInterface({ input, output });

  let username: string;
  let newPassword: string;

  try {
    username = await rl.question('Username: ');
    newPassword = await rl.question('New Password: ');
  } finally {
    rl.close();
  }

  const trimmedUsername = username.trim().toLowerCase();
  if (!trimmedUsername) {
    // eslint-disable-next-line no-console
    console.error('Error: Username cannot be empty.');
    process.exit(1);
  }
  if (newPassword.length < 8) {
    // eslint-disable-next-line no-console
    console.error('Error: New password must be at least 8 characters long.');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('Connecting to database...');
  await connectDatabase();

  try {
    const adminRepository = new AdminRepository();

    // Check if user exists
    const admin = await adminRepository.findByUsername(trimmedUsername);
    if (!admin) {
      // eslint-disable-next-line no-console
      console.error(`Error: Admin user '${trimmedUsername}' not found.`);
      await disconnectDatabase();
      process.exit(1);
    }

    // Hash password
    const passwordHash = await passwordUtil.hash(newPassword);

    // Update password
    await adminRepository.updatePassword(admin.id, passwordHash);

    // eslint-disable-next-line no-console
    console.log(`Success: Password for admin '${trimmedUsername}' updated successfully.`);
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
