# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Krypta, please report it privately:

1. **GitHub Security Advisories**: Use the "Security" tab on GitHub to report privately (preferred method)
2. **Email**: Contact the repository maintainer through their GitHub profile

### What to Include

- **Description**: Clear description of the vulnerability
- **Impact**: Potential security impact and affected users
- **Reproduction Steps**: Detailed steps to reproduce the issue
- **Proof of Concept**: Code or screenshots demonstrating the vulnerability
- **Suggested Fix**: If you have ideas on how to fix it

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Fix Timeline**: Depends on severity
  - Critical: < 1 week
  - High: < 2 weeks
  - Medium: < 1 month
  - Low: Next release cycle
- **Credit**: You'll be credited in the security advisory (if desired)

## Security Considerations

### End-to-End Encryption

Krypta uses the Matrix protocol's E2EE implementation via the matrix-js-sdk:

- **Encryption Keys**: Stored in browser IndexedDB
- **Cross-Signing**: Supported for device verification
- **Unverified Devices**: User is prompted before sending

**Important**: 
- E2EE security depends on device verification
- Always verify your sessions on new devices
- Keep your recovery keys safe

### Data Storage

Krypta stores data locally in your browser:

- **IndexedDB**: Session tokens, encryption keys, cached messages, threads
- **LocalStorage**: Preferences, theme settings, notification settings

**Your Responsibility**:
- Use browser profiles/containers for multiple accounts
- Clear browser data to fully log out
- Don't use Krypta on shared/public computers without logging out

### Known Limitations

1. **Browser Storage**: Data is stored unencrypted in IndexedDB (except E2EE message content)
2. **Session Persistence**: Access tokens are stored in LocalStorage
3. **XSS Risk**: Standard web app XSS risks apply
4. **No Server-Side Security**: Krypta is a client-only app

### Best Practices for Users

1. **Use HTTPS**: Always access Krypta over HTTPS in production
2. **Verify Sessions**: Verify new sessions with existing devices
3. **Update Regularly**: Keep Krypta updated to latest version
4. **Strong Passwords**: Use strong, unique passwords for your Matrix account
5. **2FA**: Enable 2FA on your Matrix account if available
6. **Review Devices**: Regularly review and remove old devices in Element

### Security Features

- **Per-Room Device Verification Control**: Choose when to send to unverified devices
- **Encryption Indicators**: Visual indicators for encrypted rooms/messages
- **Secure Context Requirements**: Desktop notifications only work in HTTPS/localhost
- **Session Isolation**: Each browser profile has separate storage

## Security Updates

Security updates will be released as patches and announced:

- GitHub Security Advisories
- Release notes
- README updates

## Scope

This security policy applies to:

- Krypta client code (this repository)
- Dependencies that Krypta directly controls

**Out of Scope**:
- Matrix homeservers
- Matrix protocol itself
- Third-party Matrix clients
- Browser security issues
- Matrix.org infrastructure

## Responsible Disclosure

We kindly ask security researchers to:

- Allow reasonable time for fixes before public disclosure
- Make a good faith effort to avoid privacy violations and data destruction
- Not exploit the vulnerability beyond what's necessary to demonstrate it
- Not perform testing on homeservers you don't own without permission

## Recognition

We appreciate security researchers who help improve Krypta's security:

- Acknowledged in security advisories (optional)
- Listed in project contributors
- Public thanks in release notes

Thank you for helping keep Krypta and its users safe! 🔒

