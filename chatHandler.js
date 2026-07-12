const QUANTUM_SYSTEM_INSTRUCTION = `
You are the official Quantum Language Assistant, a premium AI helper designed to explain, write, and debug code in the Quantum programming language.

Quantum is a dynamically typed, multi-paradigm scripting language that compiles .sa source files to bytecode and runs them on a custom register-stack VM. It was written in C++17 from scratch.

### Architecture & Internals
1. The Two Execution Paths:
   - quantum (compile + bundle): Source → Lexer → Parser → TypeChecker (emits warnings only, doesn't block execution) → Compiler → Serializer (binary payload). It then copies quantum_stub.exe to <file>.exe and appends [payload bytes][payload size: uint32 LE]["QNTM_VM!" magic] to the end. On launch, the executable deserializes the chunk and feeds it to the VM.
   - qrun (direct interpretation): Source → Lexer → Parser → TypeChecker → Compiler → VM::run(). No files are written to disk.
2. The Compiler: Walks the AST in a single pass. Emits Instruction structs into a Chunk (representing top-level script or nested function bodies). Manages CompilerState stack to track locals, scopes, and upvalue captures.
3. The VM: Stack-based interpreter centering on a CallFrame stack. CallFrame holds Closure, instruction pointer (ip), and stackBase offset.
4. Exception Handling: uses try/catch blocks. PUSH_HANDLER records catch IP and stack/frame depths to unwind to. RAISE unwinds CallFrames, restores the value stack, and jumps to the catch block.
5. Serializer: converts a Chunk tree to a flat binary payload and back.
6. Disassembler: pass --dis or --debug to dump compiled bytecode instruction offsets, opcodes, and operands.

### Language Syntax & Features
1. Multi-Syntax Support:
   - Python-style, JavaScript-style, and C/C++-style syntax are all valid and can be mixed in the same file.
   - Variable styles: 'name = "Alice"' (bare), 'let x = 42' (quantum), 'const MAX = 100' (const), and 'int count = 0' (decorative C++ style type hint).
   - Control flow: picking 'if x > 0:' (Python-style), 'if x > 0 { ... }' (brace-style), or 'if(x > 0) { ... }' (C++ style).
2. Five Function Styles:
   - Quantum style: fn add(a, b) { return a + b }
   - Python style: def greet(name): return "Hi, " + name
   - JS style: function mul(a, b) { return a * b }
   - Arrow style: double = (x) => x * 2
   - Anonymous style: square = fn(n) { return n * n }
3. Closures: Functions capture their enclosing scope through upvalues (heap-allocated shared cells that copy the stack values into Upvalue::closed when variables go out of scope).
4. Object-Oriented Programming:
   - Uses 'class Name', 'fn init(...)', 'self' instead of 'this', and supports inheritance using 'extends'.
5. Pointers (Real pointers in a scripting language!):
   - Address-of: '&x'
   - Dereference + assign: '*ptr = 99'
   - Object arrow operator: 'pp = &p; print(pp->x)'
6. Collections:
   - Arrays with slicing: 'arr = [1, 2, 3, 4, 5]; print(arr[1:3]);' (slices are inclusive-exclusive like Python) or 'arr[::-1]' to reverse.
   - List comprehensions: 'squares = [x * x for x in range(1, 6)]'
   - Dictionaries: 'person = { "name": "Saad", "age": 18 }'
7. Exception Handling:
   - Uses 'try/catch' blocks: 'try { if x == 0 { throw "err" } } catch(e) { print(e) }'
8. Bitwise operations: '&' (AND), '|' (OR), '^' (XOR), '~' (NOT), '<<' (SHL), '>>' (SHR).
9. Standard Library (200+ native functions):
   - Core: len(), type(), typeof(), range(), print(), input(), assert(), exit(), list(), enumerate(), zip(), map(), filter(), sorted(), reversed(), sum(), any(), all(), isinstance()
   - Math: abs, sqrt, floor, ceil, round, pow, log, log2, log10, sin, cos, tan, asin, acos, atan, atan2, min, max, is_prime, gcd, lcm, mod_pow, PI, E, INF
   - Type conversion: num, int, float, str, bool, chr, ord, parseInt, parseFloat, isNaN, hex, bin
   - Strings: .trim(), .upper(), .lower(), .split(), .replace(), .contains(), .starts_with(), .ends_with(), .index_of(), .slice(), .repeat()
   - Arrays: .push(v), .pop(), .slice(), .map(fn), .filter(fn), .reduce(fn), .includes(v), .index_of(v), .sort(), .reverse(), .join()
   - Dictionaries: .get(k), .set(k, v), .has(k), .remove(k), .keys(), .values()
   - File I/O: write_file("out.txt", content), read_file("in.txt")
   - Encoding: base64_encode, base64_decode, to_hex, from_hex, url_encode, url_decode, rot13, xor_bytes, str_to_hex_escape
   - Hashing & Crypto: sha256(s), sha1(s), md5(s), hmac_sha256(key, msg), aes128_ecb_encrypt(key, plaintext), aes128_ecb_decrypt(key, ciphertext), vigenere_encrypt, vigenere_decrypt, pkcs7_pad, pkcs7_unpad, constant_time_eq
   - Random: secure_random_hex(n), secure_random_int(min, max), entropy(s)
   - Network: ip_to_int(ip), ip_in_cidr(ip, cidr), cidr_hosts(cidr), parse_http_request(raw)
   - String distance: hamming_distance, edit_distance (Levenshtein), luhn_check
   - printf format specifiers: %d/%i (integer), %f (float), %e (scientific), %s (string), %c (char), %x/%X (hex), %o (octal), %b (binary)

### CLI Reference
- quantum <file.sa>: Compiles to <file>.exe, then runs it.
- quantum --run <file.sa> / qrun <file.sa>: Interprets directly (no .exe created).
- quantum --check <file.sa>: Parse + typecheck only.
- quantum --debug <file.sa>: Disassemble + run.
- quantum --dis <file.sa>: Disassemble + exit.
- quantum --test [dir]: Batch test runner.
- qrun: Starts interactive REPL.

When answering:
- Keep your answers highly developer-oriented, precise, and concise.
- Format all code snippets in markdown code blocks. Since Quantum combines JS, Python, and C++, you can use 'javascript', 'python', or 'cpp' tags for beautiful syntax highlighting in code blocks.
- If writing code, ensure it adheres to valid Quantum syntax.
- Be extremely friendly and helpful, matching the cybersecurity/hacker futuristic vibe of the website.
`;

const LOCAL_FALLBACK_RESPONSES = {
    architecture: `### What is Quantum?
Quantum is a **dynamically typed, multi-paradigm scripting language** that compiles \\\`sa\\\` source files to bytecode and runs them on a custom register-stack VM. It was written in C++17 from scratch.

The build produces three binaries with distinct roles:
| Binary | Role |
| :--- | :--- |
| **quantum.exe** | Compiles \\\`.sa\\\` → bytecode → bundles into a self-contained \\\`.exe\\\`, then runs it |
| **qrun.exe** | Interprets \\\`.sa\\\` directly — no \\\`.exe\\\` is generated |
| **quantum_stub.exe** | The bare VM runtime that gets bundled into produced executables |

#### How it Works: The Two Execution Paths
1. **quantum — compile + bundle**:
   \\\`.sa\\\` source → **Lexer** (Token stream) → **Parser** (AST) → **TypeChecker** (static warnings only) → **Compiler** (emits bytecode instructions in a Chunk) → **Serializer** (binary payload) → Copy \\\`quantum_stub.exe\\\` to \\\`<file>.exe\\\` and append \\\`[payload bytes][payload size: uint32 LE]["QNTM_VM!" magic]\\\` at the end.
   *When running, the executable seeks to the end, reads the payload size, deserializes the Chunk, and feeds it to the VM.*
   
2. **qrun — direct interpretation**:
   \\\`.sa\\\` source → **Lexer** → **Parser** → **TypeChecker** → **Compiler** → **VM::run()**.
   *Same pipeline but runs directly in memory without writing any files to disk.*

#### The Compiler & VM Internals
* **The Compiler**: Walks the AST in a single pass and emits Instruction structs into Chunks. Maintains a \\\`CompilerState\\\` stack to track locals, scope depth, and upvalue captures.
* **The VM**: A stack-based interpreter built around a \\\`CallFrame\\\` stack. Each frame holds a Closure (chunk + captured upvalues), instruction pointer (\\\`ip\\\`), and a \\\`stackBase\\\` offset for local variables on the value stack.
* **Exception Handling**: Uses try/catch blocks. \\\`PUSH_HANDLER\\\` records catch IP and stack/frame depths. \\\`RAISE\\\` walks the handler stack, unwinds call frames, and jumps to the catch block.

*Running in local fallback mode. Define \\\`GROQ_API_KEY\\\` or \\\`GEMINI_API_KEY\\\` in your backend \\\`.env\\\` file to activate live AI responses.*`,

    syntax: `### Language Syntax & Features
Quantum accepts Python-style, JavaScript-style, and C/C++-style syntax — all valid inside the same file.

#### Multi-Syntax & Variables
\\\`\\\`\\\`python
# Variables - choose your style
name = "Alice"           # bare assignment (Python style)
let x = 42               # quantum style
const MAX = 100          # constant (cannot be reassigned)
int count = 0            # C-style type hint (decorative only - dynamically typed)

# Control flow - three styles
if x > 0:
    print("positive")    # Python-style

if x > 0 { 
    print("positive")    # brace-style
}

if (x > 0) { 
    printf("%d\\\\n", x)   # C-style
}
\\\`\\\`\\\`

#### Functions (Five Styles)
\\\`\\\`\\\`javascript
fn add(a, b) { return a + b }           // quantum style
def greet(name): return "Hi, " + name  // python style
function mul(a, b) { return a * b }    // javascript style
double = (x) => x * 2                  // arrow syntax
square = fn(n) { return n * n }        // anonymous function
\\\`\\\`\\\`

#### Pointers (First-Class C-Style)
\\\`\\\`\\\`python
let x = 42
let p = &x        # address-of — p holds a live reference to x
*p = 99           # dereference and assign
print(x)          # Output: 99

# Object pointer with arrow operator
class Point { fn init(x, y) { self.x = x; self.y = y } }
let p = Point(3, 4)
let pp = &p
print(pp->x)      # Output: 3
\\\`\\\`\\\`

#### Closures & Upvalues
Functions capture variables in outer scopes using heap-allocated Upvalue cells:
\\\`\\\`\\\`javascript
fn make_counter(start) {
    let count = start
    return fn() {
        count += 1
        return count
    }
}
let c = make_counter(0)
print(c(), c(), c())   # 1 2 3
\\\`\\\`\\\`

#### OOP & Inheritance
\\\`\\\`\\\`javascript
class Animal {
    fn init(name, sound) {
        self.name  = name
        self.sound = sound
    }
    fn speak() { return self.name + " says " + self.sound }
}

class Dog extends Animal {
    fn fetch(item) { return self.name + " fetches " + item }
}
let dog = Dog("Rex", "Woof")
print(dog.speak())
\\\`\\\`\\\`

*Running in local fallback mode. Define \\\`GROQ_API_KEY\\\` or \\\`GEMINI_API_KEY\\\` in your backend \\\`.env\\\` file to activate live AI responses.*`,

    stdlib: `### Standard Library Reference
Quantum registers over 200 native helper functions directly in the VM.

#### Core & Math Functions
* **Core**: \\\`len()\\\`, \\\`type()\\\`, \`typeof()\\\`, \\\`range()\\\`, \\\`print()\\\`, \\\`input()\\\`, \\\`assert()\\\`, \\\`exit()\\\`, \\\`list()\\\`, \\\`enumerate()\\\`, \\\`zip()\\\`, \\\`map()\\\`, \\\`filter()\\\`, \\\`sorted()\\\`, \\\`reversed()\\\`, \\\`sum()\\\`, \\\`any()\\\`, \\\`all()\\\`, \\\`isinstance()\\\`
* **Math**: \\\`abs\\\`, \\\`sqrt\\\`, \\\`floor\\\`, \\\`ceil\\\`, \\\`round\\\`, \\\`pow\\\`, \\\`log\\\`, \\\`log2\\\`, \\\`log10\\\`, \\\`sin\\\`, \\\`cos\\\`, \\\`tan\\\`, \\\`asin\\\`, \\\`acos\\\`, \\\`atan\\\`, \\\`atan2\\\`, \\\`min\\\`, \\\`max\\\`, \\\`is_prime\\\`, \\\`gcd\\\`, \\\`lcm\\\`, \\\`mod_pow\\\` (Constants: \\\`PI\\\`, \\\`E\\\`, \\\`INF\\\`)
* **Type conversion**: \\\`num\\\`, \\\`int\\\`, \\\`float\\\`, \\\`str\\\`, \\\`bool\\\`, \\\`chr\\\`, \\\`ord\\\`, \\\`parseInt\\\`, \\\`parseFloat\\\`, \\\`isNaN\\\`, \\\`hex\\\`, \\\`bin\\\`

#### Data Structures & Files
* **Strings**: \\\`.trim()\\\`, \\\`.upper()\\\`, \\\`.lower()\\\`, \\\`.split(sep)\\\`, \\\`.replace(a, b)\\\`, \\\`.contains(s)\\\`, \\\`.starts_with(s)\\\`, \\\`.ends_with(s)\\\`, \\\`.index_of(s)\\\`, \\\`.slice(a, b)\\\`, \\\`.repeat(n)\\\`
* **Arrays**: \\\`.push(v)\\\`, \\\`.pop()\\\`, \\\`.slice(a, b)\\\`, \\\`.map(fn)\\\`, \\\`.filter(fn)\\\`, \\\`.reduce(fn, init)\\\`, \\\`.includes(v)\\\`, \\\`.index_of(v)\\\`, \\\`.sort()\\\`, \\\`.reverse()\\\`, \\\`.join(sep)\\\` (Slices: \\\`arr[1:3]\\\` or \\\`arr[::-1]\\\` like Python)
* **Dictionaries**: \\\`.get(k)\\\`, \\\`.set(k, v)\\\`, \\\`.has(k)\\\`, \\\`.remove(k)\\\`, \\\`.keys()\\\`, \\\`.values()\\\`
* **File I/O**: \\\`write_file("output.txt", content)\\\`, \\\`read_file("input.txt")\\\`

#### Security, Cryptography & Network
* **Hashing**: \\\`sha256(s)\\\`, \\\`sha1(s)\\\`, \\\`md5(s)\\\`, \\\`hmac_sha256(key, msg)\\\`
* **Encryption**: \\\`aes128_ecb_encrypt(key, plaintext)\\\`, \\\`aes128_ecb_decrypt(key, ciphertext)\\\`, \\\`vigenere_encrypt(key, text)\\\`, \\\`vigenere_decrypt(key, text)\\\`, \\\`pkcs7_pad(data, block_size)\\\`, \\\`pkcs7_unpad(data)\\\`, \\\`constant_time_eq(a, b)\\\`
* **Encoding & Random**: \\\`base64_encode\\\`, \\\`base64_decode\\\`, \\\`to_hex\\\`, \\\`from_hex\\\`, \\\`url_encode\\\`, \\\`url_decode\\\`, \\\`rot13\\\`, \\\`xor_bytes\\\`, \\\`secure_random_hex(n)\\\`, \\\`secure_random_int(min, max)\\\`, \\\`entropy(s)\\\`
* **Network & Distance**: \\\`ip_to_int(ip)\\\`, \\\`ip_in_cidr(ip, cidr)\\\`, \\\`cidr_hosts(cidr)\\\`, \\\`parse_http_request(raw)\\\`, \\\`hamming_distance(a, b)\\\`, \\\`edit_distance(a, b)\\\` (Levenshtein), \\\`luhn_check(n)\\\`

#### \\\`printf\\\` Format Specifiers
| Specifier | Meaning |
| :--- | :--- |
| **%d / %i** | Integer |
| **%f** | Float |
| **%e** | Scientific notation |
| **%s** | String |
| **%c** | Character |
| **%x / %X** | Hex lower / upper |
| **%o** | Octal |
| **%b** | Binary |

*Running in local fallback mode. Define \\\`GROQ_API_KEY\\\` or \\\`GEMINI_API_KEY\\\` in your backend \\\`.env\\\` file to activate live AI responses.*`,

    build: `### Build & CLI Reference

#### CLI Commands
* **\`quantum <file.sa>\`**: Compile \\\`<file.sa>\\\` → \\\`<file>.exe\\\`, then run it.
* **\`quantum --run <file.sa>\`** or **\`qrun <file.sa>\`**: Interpret directly (no \\\`.sa\\\` created).
* **\`quantum --check <file.sa>\`**: Parse + type-check only, no execution.
* **\`quantum --debug <file.sa>\`**: Dump bytecode disassembly, then run.
* **\`quantum --dis <file.sa>\`**: Dump bytecode disassembly only, then exit.
* **\`quantum --test [dir]\`**: Batch test runner (runs all \\\`.sa\\\` files in directory, crash-guarded via setjmp/longjmp).
* **\`qrun\`** (with no arguments): Starts interactive REPL.

#### Build Instructions
**Prerequisites**: C++17 compiler (MSVC 2019+, GCC 9+, Clang 10+), CMake 3.16+
* **Windows**:
  * \\\`build.bat\\\` - Full clean build
  * \\\`build-fast.bat\\\` - Incremental build
* **Linux / macOS**:
  \\\`\\\`\\\`bash
  mkdir build && cd build
  cmake .. -DCMAKE_BUILD_TYPE=Release
  cmake --build .
  \\\`\\\`\\\`
  *(Uses static linking \\\`-static -static-libgcc -static-libstdc++\\\` on non-MSVC platforms to build standalone binaries)*.

*Running in local fallback mode. Define \\\`GROQ_API_KEY\\\` or \\\`GEMINI_API_KEY\\\` in your backend \\\`.env\\\` file to activate live AI responses.*`,

    help: `### Welcome to Quantum AI Assistant!
I'm here to help you learn and build applications using the **Quantum Language**.

Here is what you can ask me about:
* **Overview & Architecture**: Two execution paths (compile + bundle vs direct interpretation), compiler stack, and stack-based VM call frames.
* **Language Syntax & OOP**: Combining Python, JS, and C/C++ syntax in a single file, closures, OOP with inheritance, exception handling, and pointers.
* **Standard Library & Crypto**: Over 200 native functions, including hashing (SHA-256/1, MD5), encryption (AES-128 ECB), rot13, base64, Shannon entropy, and file I/O.
* **Build & CLI Tools**: Running the REPL, running tests, compiling with \\\`quantum.exe\\\`, and using the \\\`qrun.exe\\\` interpreter.

*Type a message or select one of the quick prompts to get started!*

*Running in local fallback mode. Define \\\`GROQ_API_KEY\\\` or \\\`GEMINI_API_KEY\\\` in your backend \\\`.env\\\` file to activate live AI responses.*`
};

async function handleChatRequest(req, res) {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'Messages array is required.' });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const userText = lastUserMessage ? lastUserMessage.content : '';

    let groqApiKey = process.env.GROQ_API_KEY;
    let geminiApiKey = process.env.GEMINI_API_KEY;

    // Safeguard: If the key assigned to GEMINI_API_KEY starts with 'gsk_', treat it as Groq key
    if (geminiApiKey && geminiApiKey.startsWith('gsk_')) {
        groqApiKey = geminiApiKey;
        geminiApiKey = null;
    }

    if (groqApiKey) {
        try {
            const formattedMessages = [
                { role: 'system', content: QUANTUM_SYSTEM_INSTRUCTION },
                ...messages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                }))
            ];

            const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
            const response = await fetch(groqUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqApiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: formattedMessages,
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('Groq API error status:', response.status, errData);
                throw new Error(errData.error?.message || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            const replyText = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

            return res.json({
                success: true,
                message: replyText,
                isFallback: false
            });

        } catch (err) {
            console.error('Error generating response via Groq:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate AI response via Groq. Details: ' + err.message
            });
        }
    } else if (geminiApiKey) {
        try {
            // Map messages to Gemini API content format
            const geminiContents = messages.map(msg => {
                const role = msg.role === 'assistant' ? 'model' : 'user';
                return {
                    role,
                    parts: [{ text: msg.content }]
                };
            });

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: geminiContents,
                    systemInstruction: {
                        parts: [{ text: QUANTUM_SYSTEM_INSTRUCTION }]
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('Gemini API error status:', response.status, errData);
                throw new Error(errData.error?.message || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";

            return res.json({
                success: true,
                message: replyText,
                isFallback: false
            });

        } catch (err) {
            console.error('Error generating response via Gemini:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate AI response. Details: ' + err.message
            });
        }
    } else {
        // Fallback local mode
        const text = userText.toLowerCase();
        let reply = LOCAL_FALLBACK_RESPONSES.help;
        let matched = false;

        if (text.includes('architecture') || text.includes('purpose') || text.includes('how it work') || text.includes('internals') || text.includes('compiler') || text.includes('vm') || text.includes('serializer') || text.includes('disassembler') || text.includes('overview')) {
            reply = LOCAL_FALLBACK_RESPONSES.architecture;
            matched = true;
        }
        if (!matched && (text.includes('syntax') || text.includes('pointer') || text.includes('class') || text.includes('oop') || text.includes('closure') || text.includes('inheritance') || text.includes('exception') || text.includes('style') || text.includes('feature'))) {
            reply = LOCAL_FALLBACK_RESPONSES.syntax;
            matched = true;
        }
        if (!matched && (text.includes('standard library') || text.includes('stdlib') || text.includes('function') || text.includes('crypto') || text.includes('hash') || text.includes('encrypt') || text.includes('encoding') || text.includes('network') || text.includes('printf'))) {
            reply = LOCAL_FALLBACK_RESPONSES.stdlib;
            matched = true;
        }
        if (!matched && (text.includes('build') || text.includes('cli') || text.includes('reference') || text.includes('compile') || text.includes('run') || text.includes('repl') || text.includes('test') || text.includes('binary') || text.includes('binaries'))) {
            reply = LOCAL_FALLBACK_RESPONSES.build;
            matched = true;
        }

        return res.json({
            success: true,
            message: reply,
            isFallback: true
        });
    }
}

module.exports = {
    handleChatRequest
};
