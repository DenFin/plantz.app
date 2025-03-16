import { defineEventHandler } from 'h3';
import { queryDatabase } from '../utils/db';

export default defineEventHandler(async (event) => {
    try {
        // Example: Get all users from the "users" table
        const users = await queryDatabase('SELECT * FROM users');
        return { users };
    } catch (error) {
        console.error('Error fetching users:', error);
        return { error: 'Failed to fetch users' };
    }
});