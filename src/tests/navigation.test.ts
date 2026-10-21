import {
  getPublicAuthRoute,
  isControlRoomRoute,
  loginUrlForControlRoom,
  safeControlRoomReturnPath,
} from '../config/navigation.ts';

export function runNavigationTests() {
  const cases = [
    { id: 'ROUTE-01', name: 'Direct login route resolves', input: '/login', expected: 'login', actual: getPublicAuthRoute('/login') },
    { id: 'ROUTE-02', name: 'Direct signup route resolves with trailing slash', input: '/signup/', expected: 'signup', actual: getPublicAuthRoute('/signup/') },
    { id: 'ROUTE-03', name: 'Dashboard route is protected', input: '/dashboard', expected: true, actual: isControlRoomRoute('/dashboard', '') },
    { id: 'ROUTE-04', name: 'Legacy control room route is protected', input: '/#control-room', expected: true, actual: isControlRoomRoute('/', '#control-room') },
    { id: 'ROUTE-05', name: 'Homepage remains public', input: '/', expected: false, actual: isControlRoomRoute('/', '') },
    { id: 'ROUTE-06', name: 'Return path rejects external redirects', input: 'https://example.invalid', expected: '/dashboard', actual: safeControlRoomReturnPath('https://example.invalid') },
    { id: 'ROUTE-07', name: 'Protected route creates encoded login return URL', input: '/#control-room', expected: '/login?returnTo=%2F%23control-room', actual: loginUrlForControlRoom('/#control-room') },
  ];

  return cases.map((test) => ({
    id: test.id,
    name: test.name,
    input: test.input,
    expected: String(test.expected),
    actual: String(test.actual),
    category: 'Routing & Authentication',
    passed: test.actual === test.expected,
    evidence: `Route helper returned ${String(test.actual)}`,
    duration_ms: 0,
  }));
}
