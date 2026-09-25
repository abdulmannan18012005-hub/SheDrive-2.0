const React = require('react');

// Mock secure store
let memoryStore = {};
jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(async (key, value) => { memoryStore[key] = value; }),
    getItemAsync: jest.fn(async (key) => memoryStore[key] || null),
    deleteItemAsync: jest.fn(async (key) => { delete memoryStore[key]; })
}));

import { saveToken, getToken, removeToken } from './src/services/secureStore';
import { AuthProvider, AuthContext } from './src/store/AuthContext';
import { renderHook, act } from '@testing-library/react-native';

describe('Auth Service & Secure Store', () => {
    beforeEach(() => {
        memoryStore = {};
    });

    test('storing and retrieving a token', async () => {
        await saveToken('mock-jwt-123');
        const token = await getToken();
        expect(token).toBe('mock-jwt-123');
        await removeToken();
        const nullToken = await getToken();
        expect(nullToken).toBeNull();
    });

    test('role state switching via AuthContext', async () => {
        const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
        const { result, waitForNextUpdate } = renderHook(() => React.useContext(AuthContext), { wrapper });
        
        // Initial state
        expect(result.current?.isAuthenticated).toBe(false);
        expect(result.current?.role).toBeNull();
        
        // Sign in as driver
        await act(async () => {
            await result.current?.signIn('driver-token', { name: 'Ayesha' }, 'driver');
        });
        
        expect(result.current?.isAuthenticated).toBe(true);
        expect(result.current?.role).toBe('driver');
        expect(result.current?.token).toBe('driver-token');
        
        // Sign out
        await act(async () => {
            await result.current?.signOut();
        });
        
        expect(result.current?.isAuthenticated).toBe(false);
        expect(result.current?.role).toBeNull();
    });
});
