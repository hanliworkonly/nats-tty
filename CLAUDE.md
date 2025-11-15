# CLAUDE.md - AI Assistant Guide for nats-tty

## Project Overview

**nats-tty** is a project that appears to bridge NATS messaging with terminal/TTY interfaces. This repository is currently in its initial stages of development.

### Project Purpose
Based on the repository name, this project likely aims to:
- Provide terminal-based interaction with NATS messaging systems
- Enable TTY/terminal communication over NATS
- Create a command-line tool for NATS operations
- Implement terminal multiplexing or sharing via NATS

## Repository Structure

```
nats-tty/
├── ReadMe.md          # Project documentation (currently minimal)
├── CLAUDE.md          # This file - AI assistant guidance
└── .git/              # Git repository data
```

### Expected Future Structure
As the project develops, expect the following structure:

```
nats-tty/
├── cmd/               # Command-line applications
│   └── nats-tty/      # Main application entry point
├── pkg/               # Public libraries
│   ├── client/        # NATS client wrapper
│   ├── terminal/      # Terminal handling code
│   └── protocol/      # Protocol definitions
├── internal/          # Private application code
│   ├── session/       # Session management
│   └── handlers/      # Message handlers
├── examples/          # Example code and usage
├── docs/              # Documentation
├── scripts/           # Build and deployment scripts
├── go.mod             # Go module definition
├── go.sum             # Go module checksums
├── Makefile           # Build automation
├── Dockerfile         # Container image definition
├── .gitignore         # Git ignore rules
├── LICENSE            # License file
├── ReadMe.md          # Project documentation
└── CLAUDE.md          # This file
```

## Technology Stack

### Likely Technologies (To Be Confirmed)
- **Language**: Go (common for NATS projects and CLI tools)
- **Messaging**: NATS/NATS Streaming/JetStream
- **Terminal**:
  - `github.com/creack/pty` for PTY handling
  - `github.com/gdamore/tcell` or `github.com/charmbracelet/bubbletea` for TUI
  - `golang.org/x/term` for terminal operations

## Development Workflow

### Setting Up Development Environment

1. **Prerequisites**
   - Go 1.21+ (verify with `go version`)
   - NATS server (for local testing)
   - Git
   - Make (optional, for build automation)

2. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd nats-tty
   go mod download  # When go.mod exists
   ```

3. **Running NATS Server Locally**
   ```bash
   # Using Docker
   docker run -p 4222:4222 -p 8222:8222 nats:latest

   # Or install nats-server
   nats-server
   ```

### Git Workflow

- **Main Branch**: Development happens on feature branches
- **Current Branch**: `claude/claude-md-mhzo0487kq3xsonw-01MwiqCZBmZJFaaG4xnEwJ92`
- **Commit Messages**: Use conventional commits format
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `refactor:` for code refactoring
  - `test:` for tests
  - `chore:` for maintenance tasks

### Build Process (To Be Established)

```bash
# Expected commands
make build          # Build the binary
make test           # Run tests
make lint           # Run linters
make run            # Run locally
make docker-build   # Build Docker image
```

## Code Conventions

### Go Code Style

1. **Follow Standard Go Conventions**
   - Use `gofmt` for formatting
   - Follow `golangci-lint` recommendations
   - Use meaningful variable names
   - Keep functions small and focused

2. **Package Organization**
   - `cmd/` for executables
   - `pkg/` for importable libraries
   - `internal/` for non-exportable code
   - One package per directory

3. **Error Handling**
   ```go
   // Always handle errors explicitly
   if err != nil {
       return fmt.Errorf("operation failed: %w", err)
   }
   ```

4. **Context Usage**
   - Always pass `context.Context` as first parameter
   - Respect context cancellation
   - Use context for timeouts and cancellation

5. **Testing**
   - Unit tests in `*_test.go` files
   - Table-driven tests preferred
   - Use `t.Helper()` in test helpers
   - Aim for >80% coverage on critical paths

### NATS-Specific Conventions

1. **Connection Management**
   - Always handle disconnections gracefully
   - Implement reconnect logic
   - Use connection options appropriately
   - Close connections in defer statements

2. **Subject Naming**
   - Use hierarchical subjects: `app.component.action`
   - Keep subjects lowercase
   - Use dots for hierarchy, not dashes
   - Example: `nats-tty.session.create`

3. **Message Handling**
   - Validate all incoming messages
   - Use structured data (JSON/Protobuf)
   - Implement proper error handling
   - Consider message size limits

### Security Considerations

1. **Authentication**
   - Support NATS authentication (tokens, credentials)
   - Never hardcode credentials
   - Use environment variables or config files
   - Support TLS connections

2. **Input Validation**
   - Validate all terminal input
   - Sanitize data before sending to NATS
   - Implement rate limiting if needed
   - Handle malformed messages gracefully

3. **Terminal Security**
   - Be careful with terminal escape sequences
   - Sanitize output to prevent injection
   - Handle control characters safely
   - Consider implementing command restrictions

## AI Assistant Guidelines

### When Adding Features

1. **Research First**
   - Check if similar functionality exists in the NATS ecosystem
   - Review NATS best practices documentation
   - Look for established patterns in terminal multiplexing tools

2. **Design Considerations**
   - Keep the CLI interface simple and intuitive
   - Follow Unix philosophy: do one thing well
   - Make the tool composable with other Unix tools
   - Consider cross-platform compatibility

3. **Implementation Steps**
   - Write tests first (TDD approach)
   - Implement minimal viable feature
   - Add error handling
   - Document the feature
   - Update ReadMe.md with usage examples

### When Debugging

1. **NATS Issues**
   - Check NATS server connectivity
   - Verify subject subscriptions
   - Monitor message flow with `nats` CLI
   - Check for permission issues

2. **Terminal Issues**
   - Test on different terminal emulators
   - Verify terminal capability detection
   - Check signal handling (SIGWINCH, SIGTERM, etc.)
   - Test with different terminal sizes

3. **General Debugging**
   - Add structured logging (consider `zerolog` or `zap`)
   - Use debug mode with verbose output
   - Add tracing for message flow
   - Profile performance if needed

### Code Quality Checklist

Before committing code, ensure:

- [ ] Code is formatted with `gofmt`
- [ ] All tests pass
- [ ] No linter warnings
- [ ] Error handling is comprehensive
- [ ] Documentation is updated
- [ ] Examples are provided for new features
- [ ] Security implications are considered
- [ ] Performance is acceptable
- [ ] Code is cross-platform compatible
- [ ] Backwards compatibility is maintained

## Common Tasks

### Adding a New Command

1. Create handler in `internal/handlers/`
2. Register command in CLI parser
3. Add tests
4. Update documentation
5. Add example usage

### Adding a New NATS Subject

1. Define subject constant in `pkg/protocol/subjects.go`
2. Document subject purpose and message format
3. Implement publisher and subscriber
4. Add integration test
5. Update subject documentation

### Handling Terminal Events

1. Detect terminal capability
2. Set up signal handlers
3. Implement event loop
4. Handle resize, interrupt, and termination
5. Clean up resources on exit

## Testing Strategy

### Unit Tests
- Test individual functions and methods
- Mock NATS connections
- Mock terminal I/O
- Use table-driven tests

### Integration Tests
- Test with real NATS server
- Test end-to-end message flow
- Test different terminal scenarios
- Use Docker for test environments

### Manual Testing
- Test on Linux, macOS, Windows
- Test with different terminal emulators
- Test with different NATS configurations
- Test error scenarios and edge cases

## Dependencies Management

### Adding Dependencies
```bash
go get <package>
go mod tidy
go mod verify
```

### Key Expected Dependencies
- `github.com/nats-io/nats.go` - NATS client
- `github.com/spf13/cobra` - CLI framework
- `github.com/spf13/viper` - Configuration management
- Terminal library (TBD)
- Logging library (TBD)

## Documentation Requirements

### Code Documentation
- Document all exported functions, types, and constants
- Include usage examples in doc comments
- Explain complex algorithms
- Document performance characteristics

### User Documentation
- Keep ReadMe.md updated with:
  - Installation instructions
  - Quick start guide
  - Configuration options
  - Usage examples
  - Troubleshooting guide
  - Contributing guidelines

### API Documentation
- Document all NATS subjects and message formats
- Provide message schema definitions
- Document error codes and handling
- Include sequence diagrams for complex flows

## Performance Considerations

1. **NATS Performance**
   - Use appropriate QoS settings
   - Consider message batching
   - Monitor memory usage
   - Handle backpressure

2. **Terminal Performance**
   - Minimize screen redraws
   - Buffer output efficiently
   - Handle high-frequency input
   - Optimize rendering

3. **General Performance**
   - Profile CPU and memory usage
   - Optimize hot paths
   - Use goroutines appropriately
   - Avoid unnecessary allocations

## Troubleshooting

### Common Issues

1. **NATS Connection Failed**
   - Verify NATS server is running
   - Check network connectivity
   - Verify credentials
   - Check firewall settings

2. **Terminal Display Issues**
   - Verify terminal capabilities
   - Check terminal environment variables
   - Test with different TERM settings
   - Verify terminal size detection

3. **Performance Issues**
   - Profile the application
   - Check message throughput
   - Monitor goroutine count
   - Check for memory leaks

## Resources

### NATS Documentation
- [NATS.io](https://nats.io/)
- [NATS Go Client](https://github.com/nats-io/nats.go)
- [NATS by Example](https://natsbyexample.com/)

### Go Resources
- [Effective Go](https://golang.org/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Go Proverbs](https://go-proverbs.github.io/)

### Terminal/TTY Resources
- [TTY Demystified](https://www.linusakesson.net/programming/tty/)
- [Terminal Guide](https://poor.dev/blog/terminal-anatomy/)

## Current State

**Status**: Initial repository setup
**Last Updated**: 2025-11-15
**Active Branch**: `claude/claude-md-mhzo0487kq3xsonw-01MwiqCZBmZJFaaG4xnEwJ92`

### Immediate Next Steps
1. Update ReadMe.md with project description
2. Initialize Go module (`go mod init`)
3. Set up basic project structure
4. Implement minimal NATS connectivity
5. Implement basic terminal I/O
6. Create initial CLI scaffolding
7. Add tests and CI/CD pipeline

---

*This document should be updated as the project evolves. AI assistants should review and update this file when significant architectural or workflow changes occur.*
