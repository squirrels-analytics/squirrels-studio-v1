# Changes Required for Authentication Update

## Background
The backend has been updated to handle authentication differently. According to the API documentation and user information, the backend now manages authentication cookies internally, making it unnecessary to store the JWT token and expiry time in the client's sessionStorage.

## Required Changes

### 1. Update the Auth Context in `src/Router.tsx`
- Remove `jwtToken` and `expiryTime` from the `AuthContextType` interface
- Remove state variables for `jwtToken` and `expiryTime`
- Update the `login` function to no longer require token and expiry time parameters
- Remove storage of token and expiry in sessionStorage
- Update context provider value to no longer include these fields

### 2. Update SessionTimeoutHandler Component
- The current implementation relies on the `expiryTime` to set a timeout for session expiration
- Since this value will no longer be available, the component needs to be updated to:
  - Either remove the timeout logic entirely (cookies will expire server-side)
  - Or implement polling to check authentication status periodically

### 3. Update API Calls
- Remove all `Authorization: Bearer ${jwtToken}` headers from API calls
- Update fetch calls to include `credentials: 'include'` to send cookies with requests
- Implement a consistent way to handle 401 unauthorized responses across the application

### 4. Update the LoginPage Component
- Update the login form submission logic to handle the new authentication flow
- The response from the login endpoint will not contain token information to store
- Implement proper session management based on cookies

### 5. Update User Management and Settings
- Update API calls in `UserSettingsPage.tsx` and `UserManagementPage.tsx` to use the new authentication approach
- Remove reliance on JWT token for requests

### 6. Testing
- Test the entire authentication flow from login to logout
- Ensure that secure routes remain secure
- Verify that session timeout behavior works as expected
- Check that all API calls work correctly with the new cookie-based authentication

## Implementation Approach
1. Start by updating the Auth Context to remove JWT token and expiry time
2. Update all API calls to use `credentials: 'include'` instead of Authorization headers
3. Modify the SessionTimeoutHandler to work with the new authentication approach
4. Test each component after modifications to ensure proper functionality

## Completed Changes
1. ✅ Updated `AuthContextType` in `src/Router.tsx` to remove JWT token and expiry time references
2. ✅ Modified the `login` and `logout` functions in Auth context
3. ✅ Added server-side logout request in the logout function
4. ✅ Updated `SessionTimeoutHandler` to use polling instead of relying on expiry time
5. ✅ Updated `LoginPage` to work with cookie-based authentication 
6. ✅ Updated `UserSettingsPage` to use cookies instead of JWT token
7. ✅ Updated `RootPage` to remove JWT token and expiry time from sessionStorage cleanup
8. ✅ Updated `UserManagementPage` to use cookie-based authentication
9. ✅ Updated `ExplorerPage` to use cookie-based authentication

## Remaining Tasks
1. ⬜ Perform thorough testing according to the testing plan
2. ⬜ Fix any remaining references to JWT token in the codebase

## Detailed Testing Plan

### Authentication Flow Testing
1. **Login Test**
   - Navigate to the application root
   - Enter hostname, project name, and version
   - Proceed to login page
   - Enter username and password
   - Verify successful login takes you to explorer page
   - Check that user information is displayed correctly

2. **Session Persistence Test**
   - After login, refresh the browser
   - Verify that you remain logged in
   - Navigate to different pages and verify authentication is maintained

3. **Logout Test**
   - Click logout button
   - Verify user is redirected to login page
   - Attempt to access a protected route and verify authentication is required
   - Refresh after logout and verify user remains logged out

### API Authorization Testing
1. **Protected API Access Test**
   - Login to the application
   - Visit user settings page and verify API keys are loaded
   - Create a new API key and verify success
   - Delete an API key and verify success

2. **Admin-Only Features Test** (if applicable)
   - Login as an admin user
   - Verify access to user management page
   - Login as a non-admin user
   - Verify user management page is not accessible

3. **Authentication Timeout Test**
   - Login to the application
   - Wait for session timeout (~5 minutes for test polling interval)
   - Attempt to access a protected API or page
   - Verify user is redirected to login page with appropriate message

### Cross-Browser and Platform Testing
1. Test in Chrome, Firefox, and Safari
2. Test in both desktop and mobile environments
3. Test with cookies enabled and disabled

### Edge Cases Testing
1. **Network Issue Handling**
   - Simulate network interruption during API calls
   - Verify application handles errors gracefully

2. **Concurrent Sessions Test**
   - Login in two different browser sessions
   - Verify both sessions work independently
   - Logout in one session and verify the other remains active

3. **CORS and Cookie Handling**
   - Verify that cookies are properly sent across domains (if applicable)
   - Test with various cookie settings in the browser 