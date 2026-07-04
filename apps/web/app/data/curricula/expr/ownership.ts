import type { Curriculum } from "@mind-palace/curriculum";

import { tokioUringSource } from "./_sources";

// Ownership as Protocol — move semantics as API design language, anchored in
// tokio-uring's completion-model choreography: the buf-result tuple,
// complete(self) linearity, owned slice views, drop-detach cancellation,
// checkout handles, SharedFd refcount signaling — then the bytes crate's
// freeze()/cheap-clone contracts and iggy's validated wire views. Bare-rust
// drills are rustc-verified; the bytes drill is cargo-sandbox checked by
// scripts/verify-rust-cards.ts. tokio-uring/io-uring code appears only in
// prose and question text (linux-only); drills recreate the shapes in std.
export const exprOwnership: Curriculum = {
  id: "c-expr-ownership",
  title: "Ownership as Protocol",
  source: tokioUringSource,
  nodes: [
    {
      id: "ownership-map",
      title: "Ownership as Protocol: The Map",
      content: {
        type: "read",
        markdown:
          'Every Rust course teaches ownership as a rule you obey. This curriculum teaches it as a ==design language you write in==. Moves, borrows, and `Copy` vs `Clone` are assumed cold — here they become the raw material of API contracts.\n\n## The generative problem\n`io_uring` is a completion-model kernel API: you describe an I/O operation up front — file descriptor, pointer, length — submit it, and the kernel performs the I/O ==while your code keeps running==. The kernel holds your pointer for an unbounded window, and the borrow checker has no primitive for "the kernel is borrowing this." Two escapes exist: mark the promise `unsafe` (the low-level `io-uring` crate), or ==move ownership itself into the operation== — the `tokio-uring` answer, and the star of this curriculum. (The async curriculum dissects readiness vs completion in full; here we need only this one fact.)\n\n## The shapes you will learn to build\n- `let (res, buf) = file.read_at(buf, 0).await` — a buffer moved in and handed back, win or lose\n- `let frame: Bytes = staging.freeze()` — a one-way transition from unique-and-mutable to shared-and-immutable\n- `frame.clone()` — a documented O(1) promise that reshapes every API downstream\n- `registry.check_out(0)` returning `Option<FixedBuf>` — a linear type enforced at runtime\n- `WireMessageView::new(buf)?` — validate once, then infallible accessors forever\n\n## The claim\nIn each shape, the signature IS the protocol: who owns what, when it transfers, and what the compiler can therefore prove. When a callee takes `self` or `buf: T` by value, that move is a ==message to the reader==, not an implementation detail.',
      },
    },
    {
      id: "buf-result-tuple",
      title: "The Buf-Result Tuple",
      content: {
        type: "read",
        markdown:
          '## The shape\n`let (res, buf) = file.read_at(buf, 0).await;` — tokio-uring\'s signature move. The buffer goes in ==by value== and comes back inside the result, ==whether the read succeeded or not==. Compare tokio proper: `file.read(&mut buf).await` borrows. Same verb, opposite ownership story.\n\n## The machinery\nIn `tokio-uring/src/lib.rs`: `pub type BufResult<T, B> = (std::io::Result<T>, B);` — and the docs promise the buffer "is returned whether or not the operation completed successfully." `File::read_at` in `src/fs/file.rs` is `pub async fn read_at<T: BoundedBufMut>(&self, buf: T, pos: u64) -> BufResult<usize, T>` — note `buf: T`, no `&`. While the kernel works, the op struct owns the buffer; at completion the buffer moves back out.\n\nNotice it is a ==bare tuple, not a named struct== — deliberately. Destructuring `let (res, buf) =` is the intended idiom: it forces the caller to re-bind the buffer into scope on every call. A struct would invite field access and let the buffer quietly rot inside a forgotten value.\n\n## The trade-off\nBuys: zero-copy kernel I/O with ==no `unsafe` at any user call-site==, and a self-teaching API — the signature is the io_uring mental model in one line. Costs: verbosity (every call re-binds its buffer), no interop with the borrow-based `AsyncRead`/`AsyncWrite` ecosystem, and buffer reuse now threads through your control flow — an error path that drops the buffer silently throws away the allocation.',
      },
    },
    {
      id: "complete-consumes-self",
      title: "complete(self): Exit by Move Only",
      content: {
        type: "read",
        markdown:
          "Flip to the op author's seat: where does the returned buffer actually come from?\n\n## The shape\nEvery tokio-uring operation ends in one template, from `src/io/read.rs`: `fn complete(self, cqe: CqeResult) -> Self::Output`, whose body moves the buffer out with `let mut buf = self.buf;` and returns `(res, buf)`.\n\n## The machinery\n`src/runtime/driver/op/mod.rs` defines `trait Completable { type Output; fn complete(self, cqe: CqeResult) -> Self::Output; }`. The receiver is the whole design: taking ==`self` by value== means the ONLY way to produce an `Output` is to consume the op — the buffer moves out ==exactly once==, and no code path exists where it is both returned to the user and still registered with the kernel. For the read op, `complete` also calls `unsafe { buf.set_init(n) }` — the runtime, not the user, asserts how many bytes the kernel initialized.\n\nMulti-completion ops add `trait Updateable: Completable { fn update(&mut self, cqe: CqeResult); }` — zero-copy sends accumulate progress through `&mut self` on interim completions, and only the final one gets the consuming `complete`. A phantom `CqeType` marker on the `Op` struct picks the right `Future` impl at compile time — the marker-type dispatch you built in the typestate curriculum, earning rent here.\n\n## The trade-off\nBuys: linear-type discipline enforced by ordinary move semantics — no lifetimes, no runtime flags — and each new syscall costs one small trait impl. Costs: `Completable` is `pub(crate)`. The sealing that guarantees the invariant also means outsiders cannot add their own ops to tokio-uring at all.",
      },
    },
    {
      id: "owned-slice-view",
      title: "Owned Slices: std Shapes, No Borrows",
      content: {
        type: "read",
        markdown:
          "## The problem\nWith borrowed buffers, writing bytes 4..8 is `file.write(&buf[4..8])`. But tokio-uring ops take buffers ==by value== — `&buf[4..8]` is a borrow, and there is nothing left to borrow from once the buffer has moved into the op. Does every partial write need a copy?\n\n## The shape\n`file.write_at(buf.slice(4..8), 0)` — slicing that ==takes ownership and remembers the range==. Afterwards, `let buf = slice.into_inner();` recovers the whole buffer. The call-site reads like std slicing with one extra word.\n\n## The machinery\n`tokio-uring/src/buf/bounded.rs` defines `trait BoundedBuf` with `fn slice(self, range: impl RangeBounds<usize>) -> Slice<Self::Buf>` — note `self`, not `&self`. A ==blanket impl over every `IoBuf`== (the unsafe capability trait from the typestate curriculum) makes all buffers sliceable, and `Slice<T>` in `src/buf/slice.rs` is just a `{ buf, begin, end }` wrapper that re-implements the buffer traits by offsetting into the inner value. Ops are bounded over `BoundedBuf` rather than `IoBuf` directly, precisely so `Vec<u8>` and `Slice<Vec<u8>>` flow through the same signature. Range validation happens ==eagerly at construction== — parse, don't validate, applied to a range.\n\n## The trade-off\nBuys: call-site familiarity — the ownership rupture costs the reader almost no new vocabulary, because `.slice(4..8)` leans on the `&buf[4..8]` shape they already know. Costs: an entire parallel abstraction stack (`Slice`, `BoundedBuf`, `BoundedBufMut`, associated-type plumbing) to replicate what reborrowing does for free in the borrow world, plus `into_inner()` ceremony to get the buffer back.",
      },
    },
    {
      id: "drop-detach",
      title: "Drop-Detach: Cancellation Choreography",
      content: {
        type: "read",
        markdown:
          "## The shape\nRace a read against a timeout: put `file.read_at(buf, 0)` in a `tokio::select!` arm next to a timer. When the timer wins, the read future is ==dropped while the kernel may still be writing into the buffer==. In tokio-uring, nothing dangles, nothing leaks, no unsafe. The achievement is that the call-site shows nothing at all.\n\n## The machinery\nThe driver tracks each op in a slab. `src/runtime/driver/op/mod.rs`: `enum Lifecycle { Submitted, Waiting(Waker), Ignored(Box<dyn Any>), Completed(..) }`. When an in-flight op's future drops, the driver does NOT free the buffer — it moves the op's owned state (buffer plus fd handle) into ==`Lifecycle::Ignored(Box<dyn Any>)`==, parked until the kernel's completion entry finally arrives; only then is it dropped. `Box<dyn Any>` is pragmatic erasure: the slab stores heterogeneous op payloads and never needs to look inside again.\n\nThis is the payoff of the buf-result move: ==only an owned buffer can be detached from its owner's lifetime==. A borrowed buffer is chained to the caller's stack frame — the exact frame that just disappeared.\n\n## The trade-off\nBuys: absolute cancellation safety — `select!` and timeouts, the classic killers of completion-model designs, become safe by construction. Costs: dropping the future does ==not cancel the syscall== (the read still happens, and the memory stays allocated until the completion lands); one `Box` allocation on the cancellation path; and cancelled work is invisible — nothing tells you the kernel is still busy on your behalf.",
      },
    },
    {
      id: "checkout-handle",
      title: "Checkout Handles: Runtime Linear Types",
      content: {
        type: "read",
        markdown:
          'io_uring can pre-register buffers with the kernel so each op skips page-mapping — but a registered buffer is a ==shared resource with a hard uniqueness rule==: one user at a time.\n\n## The shape\n`FixedBufRegistry::new(..)` then `registry.check_out(0)` returning ==`Option<FixedBuf>`== — checkout can fail, because someone else may hold index 0. Dropping the `FixedBuf` checks it back in. The pooled variant is `pool.next(4096).await` — acquisition becomes ==just another await point== that resolves when a buffer of that size class frees up.\n\n## The machinery\nIn `tokio-uring/src/buf/fixed/`, the registry is `Rc<RefCell<..>>` state shared with every handle; `FixedBuf` carries its kernel `buf_index` and its `Drop` impl performs the check-in — the guard-authoring pattern you know from `MutexGuard`, aimed at a kernel resource. The handle also implements `IoBuf`/`IoBufMut`, so the entire buf-result protocol applies to fixed buffers ==unchanged==: "An I/O operation using the buffer takes ownership of it and returns it once completed."\n\nThe sharpest trick sits on the op itself, in `src/fs/file.rs`: `pub async fn read_fixed_at<T>(..) where T: BoundedBufMut<BufMut = FixedBuf>` — an ==associated-type equality bound==, not a plain trait bound. A `Vec<u8>` implements the buffer traits, but its `BufMut` is not `FixedBuf`, so handing an unregistered buffer to `read_fixed_at` is a ==compile error== — mirroring the kernel, which would reject a fixed-buffer op on unregistered memory.\n\n## The trade-off\nBuys: a runtime ==linear type== — `Option` at checkout plus `Drop` at check-in enforce uniqueness of a kernel-shared resource with zero unsafe at the user layer, behind the same call-site shape as ordinary reads. Costs: a uniqueness violation surfaces as `None` at runtime, not a compile error, and `Rc<RefCell<..>>` pins the whole design to the single-threaded runtime.',
      },
    },
    {
      id: "fd-refcount",
      title: "SharedFd: Refcount as Protocol",
      content: {
        type: "read",
        markdown:
          'Buffers are not the only resource the kernel borrows — every in-flight op also holds a ==file descriptor==. Close it too early and the kernel writes through a dead, or worse, recycled fd.\n\n## The shape\n`file.close().await?` — close is an ==explicit async verb that returns a `Result`==. Meanwhile, ops in flight keep the file alive no matter what the caller does.\n\n## The machinery\n`tokio-uring/src/io/shared_fd.rs`: `SharedFd { inner: Rc<Inner> }`. Every submitted op ==clones the `SharedFd` into its stored data== — the comment in `src/io/read.rs` says it outright: "Holds a strong ref to the FD, preventing the file from being closed while the operation is in-flight." `close()` then awaits uniqueness: ==`Rc::get_mut` succeeding IS the proof that no op is in flight== — a refcount you learned as a sharing mechanism, repurposed as a protocol signal meaning "all clear." Only then does it submit an async `Close` op.\n\nWhy a verb at all? `Drop` cannot return a `Result` — and `close(2)` can fail meaningfully. Making close explicit turns a silently swallowed error into a reportable one; plain `Drop` falls back to a synchronous close.\n\n## The trade-off\nBuys: use-after-close across kernel-concurrent ops is ==structurally impossible== — no discipline required, the refcount does the counting — and close errors become reportable, fixing an old std wart. Costs: `close()` is easy to forget (the fallback is silent), count-as-signal is subtle machinery to maintain, and every fd pays for a small per-handle state enum.',
      },
    },
    {
      id: "freeze-transition",
      title: "freeze(): One-Way Transitions",
      content: {
        type: "read",
        markdown:
          "## The shape\nThe `bytes` crate splits a buffer's life into two phases with two types: `let mut staging = BytesMut::with_capacity(4096);`, then `staging.put_slice(&header);` and `staging.put_slice(&payload);`, and finally ==`let frame: Bytes = staging.freeze();`== — unique-and-mutable becomes shared-and-immutable, ==forever==.\n\n## The machinery\n`bytes/src/bytes_mut.rs`: `pub fn freeze(self) -> Bytes` — zero cost, no copy. What makes it sound is the invariant `BytesMut` maintains: it is always ==the unique view into its region of memory==, which is exactly why it may hand out `&mut` access. `freeze(self)` consumes that unique handle, so after the move no writer can exist — immutable sharing is now safe by construction. This is the typestate discipline you already know, done with ==a pair of nominal types== instead of a marker parameter; `freeze` is the one-way edge between them.\n\nThe companions keep the phases honest while carving: `split()`, `split_off(at)`, and `split_to(at)` divide a `BytesMut` into disjoint unique views in O(1), and `reserve()` quietly ==reclaims the front of the buffer== once other handles drop, instead of allocating. The codec workhorse loop: fill a big `BytesMut`, `split().freeze()` frames off the front, capacity recycles.\n\nThe pattern scales past bytes: iggy's `IggyMessagesBatchMut` stages whole message batches, patches headers in place, then `freeze()`s into an immutable `IggyMessagesBatch` — the same two-phase contract ==at the domain level==.\n\n## The trade-off\nBuys: aliasing discipline the borrow checker enforces at zero runtime cost, plus the staging-then-sharing lifecycle every codec needs. Costs: a doubled type surface — every API must decide whether it speaks `BytesMut` or `Bytes`, and users must learn which is which.",
      },
    },
    {
      id: "cheap-clone-contract",
      title: "Cheap Clone as Contract",
      content: {
        type: "read",
        markdown:
          '## The shape\nAPIs take `Bytes` ==by value==, and callers clone without guilt: `tx.send(frame.clone())`, then `let header = frame.slice(0..4);` — a zero-copy view into the same allocation.\n\n## The machinery\nThe doc line on `bytes::Bytes` is the contract: "a cheaply cloneable and sliceable chunk of contiguous memory." `clone()`, `slice(range)`, `split_off`, and `split_to` all return new handles adjusting a pointer and length against the same ==refcounted region== — O(1), allocation-free. `Bytes::from_static` even makes literals free and const-constructible. (Internally a hand-rolled vtable picks per-representation behavior, and Vec-backed values ==only pay for a refcount on their first clone== — machinery the erasure curriculum dissects; here what matters is the promise.)\n\n## Documented performance IS API\nThis is the deep lesson: the O(1) promise is ==as binding as a type signature==, and downstream code is designed against it. Because clones are free, protocol APIs take owned `Bytes` instead of `&[u8]` plus a lifetime — and lifetimes ==vanish from entire protocol stacks==. That is why hyper\'s body type contains no borrows: frames can be queued, split between tasks, and retried with nothing tying them to a connection buffer.\n\n## The trade-off\nBuys: lifetime-free composability across an ecosystem — hyper, h2, tonic, and reqwest all speak `Bytes` in public signatures. Costs: it deliberately ==breaks a cultural heuristic==. Rust culture says "clone might be expensive"; `Bytes` retrains readers to treat `.clone()` as free — but only for this type, so clone cost becomes type-dependent knowledge. And heavily cloned values contend on their refcount across threads.',
      },
    },
    {
      id: "validated-wire-views",
      title: "Validated Wire Views",
      content: {
        type: "read",
        markdown:
          "## The shape\niggy's server handles millions of wire frames without deserializing them. `let view = WireMessageView::new(buf)?;` is ==the only fallible call==; after it, `view.id()`, `view.offset()`, and `view.payload()` are ==infallible, zero-copy accessors== over the raw bytes.\n\n## The machinery\n`core/binary_protocol/src/message_view.rs`: the view wraps a plain byte slice. `new()` runs the validation ONCE — header size present, overflow-checked total length — then confines itself to `buf[..total]`. Every accessor is a small `#[inline]` read at a fixed offset, its correctness justified by the constructor's check. This is ==parse-don't-validate applied to raw bytes==: the constructed value is the certificate, so downstream code carries no `Result` noise and makes no copies. (The offsets live in one layout-constants module guarded by compile-time asserts — a single home for the truth.)\n\nThe mutable twin goes further. `WireMessageViewMut::new(&mut buf)?` uses `split_at_mut` to confine itself to exactly one frame, then `view.set_offset(n)`, `view.set_timestamp(now)`, and `view.set_checksum(crc)` ==patch server-assigned fields directly into the client's serialized bytes==. The frame flows from socket to disk with 24 bytes rewritten and zero re-serialization.\n\n## The trade-off\nBuys: validity encoded in a type — no downstream error paths, zero-copy reads, and an ingestion hot path that never round-trips through structs. Costs: the bounds invariant is ==held by discipline, not the compiler== — every new accessor must stay inside the validated range — and patching in place freezes the wire layout forever; iggy reserves header bytes precisely to buy future patching room.",
      },
    },
    {
      id: "why-buffers-move",
      title: "Why Buffers Move, Not Borrow",
      content: {
        type: "multiple-choice",
        question:
          "tokio's `AsyncReadExt::read(&mut buf)` borrows its buffer, but tokio-uring's `read_at(buf, pos)` takes it by value. What forces the ownership change?",
        options: [
          "Owned parameters compile to fewer machine instructions than borrowed ones, so the hot path is faster",
          "The kernel keeps using the buffer after control returns to your code; a borrow cannot outlive its stack frame, but an owned value can be detached and parked",
          "Taking by value lets read_at accept both Vec<u8> and Bytes, which a &mut [u8] parameter could not",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "rebind-ritual-output",
      title: "The Re-Bind Ritual, Traced",
      content: {
        type: "multiple-choice",
        question: "The buf-result handoff reduced to bare moves. What does this program print?",
        language: "rust",
        code: `type BufResult = (usize, Vec<u8>);

fn fake_read(mut buf: Vec<u8>) -> BufResult {
    buf.extend_from_slice(b"abc");
    (buf.len(), buf)
}

fn main() {
    let buf = Vec::new();
    let (a, buf) = fake_read(buf);
    let (b, buf) = fake_read(buf);
    println!("{a} {b} {}", buf.len());
}`,
        options: ["3 3 3", "6 6 6", "3 6 6"],
        answerIndex: 2,
      },
    },
    {
      id: "dropped-future-mcq",
      title: "Dropped Future, In-Flight Kernel",
      content: {
        type: "multiple-choice",
        question:
          "A tokio-uring read future loses a `select!` race and is dropped while the kernel may still be writing into its buffer. What does the runtime do with the buffer?",
        options: [
          "Moves the op's owned state into a `Lifecycle::Ignored(Box<dyn Any>)` slot in the driver and drops it only when the kernel's completion finally arrives",
          "Frees it immediately — the kernel's write is cancelled synchronously before the drop returns",
          "Leaks it permanently; cancelling a completion-model op is documented as a deliberate memory leak",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "checkout-output",
      title: "Checkout Uniqueness at Runtime",
      content: {
        type: "multiple-choice",
        question:
          "A checkout registry reduced to std: each slot is checked out by `take` and checked back in by assignment. What does this program print?",
        language: "rust",
        code: `fn main() {
    let mut slots: Vec<Option<Vec<u8>>> = vec![Some(vec![0; 4])];
    let first = slots[0].take();
    let second = slots[0].take();
    slots[0] = first;
    let third = slots[0].take();
    println!("{} {} {}", second.is_some(), third.is_some(), slots[0].is_some());
}`,
        options: ["true false true", "false true false", "false false false"],
        answerIndex: 1,
      },
    },
    {
      id: "hyper-bytes-mcq",
      title: "Why hyper's Body Speaks Bytes",
      content: {
        type: "multiple-choice",
        question:
          "hyper's HTTP body machinery hands out `Bytes` values instead of `&[u8]` slices borrowed from connection buffers. What did the documented O(1)-clone contract buy the API design?",
        options: [
          "Lifetimes disappear from the public API — frames can be queued, cloned into retries, and moved across tasks with no borrow tying them to the connection",
          "Bounds checks are skipped when indexing into a Bytes value, unlike a slice",
          "It guarantees the body is contiguous in memory, so parsers can rely on SIMD",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "freeze-sound-mcq",
      title: "What Makes freeze() Sound",
      content: {
        type: "multiple-choice",
        question:
          "`BytesMut::freeze(self) -> Bytes` converts a mutable buffer into a shareable immutable one with no copy and no runtime check. Why is that sound?",
        options: [
          "Bytes installs a runtime lock that blocks writers while readers exist",
          "freeze copies the bytes into a fresh read-only allocation the first time the result is cloned",
          "BytesMut is guaranteed to be the unique view into its region, and freeze consumes it by value — after the move, no handle capable of mutation exists",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "write-bufresult",
      title: "Build: The Buf-Result Protocol",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Recreate tokio-uring\'s handoff contract in plain std. Define `pub type BufResult = (std::io::Result<usize>, Vec<u8>);`, then write `pub fn read_at(file: &[u8], buf: Vec<u8>, pos: usize) -> BufResult`: when `pos > file.len()`, return `std::io::Error::new(std::io::ErrorKind::UnexpectedEof, "past end")` — still handing the buffer back. Otherwise clear the buffer, copy up to `buf.capacity()` bytes from `file[pos..]` into it with `extend_from_slice`, and return `(Ok(n), buf)`. Every path returns the buffer.',
        solution: `pub type BufResult = (std::io::Result<usize>, Vec<u8>);

pub fn read_at(file: &[u8], mut buf: Vec<u8>, pos: usize) -> BufResult {
    if pos > file.len() {
        let err = std::io::Error::new(std::io::ErrorKind::UnexpectedEof, "past end");
        return (Err(err), buf);
    }
    let n = (file.len() - pos).min(buf.capacity());
    buf.clear();
    buf.extend_from_slice(&file[pos..pos + n]);
    (Ok(n), buf)
}`,
      },
    },
    {
      id: "write-complete",
      title: "Build: complete(self)",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Author the op side. Define `pub struct ReadOp { pub buf: Vec<u8> }` and `pub trait Completable { type Output; fn complete(self, result: std::io::Result<usize>) -> Self::Output; }` — the receiver must be `self`, by value. Then `impl Completable for ReadOp` with `Output = (std::io::Result<usize>, Vec<u8>)`: move the buffer out of `self`, and when the result is `Ok(n)`, `truncate` the buffer to `n` before returning `(result, buf)`.",
        solution: `pub struct ReadOp {
    pub buf: Vec<u8>,
}

pub trait Completable {
    type Output;
    fn complete(self, result: std::io::Result<usize>) -> Self::Output;
}

impl Completable for ReadOp {
    type Output = (std::io::Result<usize>, Vec<u8>);

    fn complete(self, result: std::io::Result<usize>) -> Self::Output {
        let mut buf = self.buf;
        if let Ok(n) = &result {
            buf.truncate(*n);
        }
        (result, buf)
    }
}`,
      },
    },
    {
      id: "write-slice",
      title: "Build: An Owned Slice View",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build the owned view. Write `pub struct Slice { buf: Vec<u8>, begin: usize, end: usize }` with three methods: `pub fn new(buf: Vec<u8>, begin: usize, end: usize) -> Result<Slice, &'static str>` rejecting `begin > end` or `end > buf.len()` with an error string (validate eagerly — parse, don't validate); `pub fn as_bytes(&self) -> &[u8]` returning `&self.buf[self.begin..self.end]`; and `pub fn into_inner(self) -> Vec<u8>` recovering the whole buffer.",
        solution: `pub struct Slice {
    buf: Vec<u8>,
    begin: usize,
    end: usize,
}

impl Slice {
    pub fn new(buf: Vec<u8>, begin: usize, end: usize) -> Result<Slice, &'static str> {
        if begin > end || end > buf.len() {
            return Err("range out of bounds");
        }
        Ok(Slice { buf, begin, end })
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.buf[self.begin..self.end]
    }

    pub fn into_inner(self) -> Vec<u8> {
        self.buf
    }
}`,
      },
    },
    {
      id: "write-freeze",
      title: "Build: Stage, Freeze, Share",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using the bytes crate, write the two-phase codec core. `pub fn build_frame(header: &[u8], payload: &[u8]) -> Bytes`: stage both slices into a `BytesMut::with_capacity(header.len() + payload.len())` via `put_slice`, then `freeze()`. And `pub fn split_frame(frame: &Bytes, header_len: usize) -> (Bytes, Bytes)` returning `(frame.slice(..header_len), frame.slice(header_len..))` — two O(1) views into the same allocation. Start with `use bytes::{BufMut, Bytes, BytesMut};`.",
        solution: `use bytes::{BufMut, Bytes, BytesMut};

pub fn build_frame(header: &[u8], payload: &[u8]) -> Bytes {
    let mut staging = BytesMut::with_capacity(header.len() + payload.len());
    staging.put_slice(header);
    staging.put_slice(payload);
    staging.freeze()
}

pub fn split_frame(frame: &Bytes, header_len: usize) -> (Bytes, Bytes) {
    (frame.slice(..header_len), frame.slice(header_len..))
}`,
      },
    },
    {
      id: "write-wire-view",
      title: "Build: A Validated Wire View",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Build iggy's validate-once view over a tiny wire format: bytes 0..4 are a little-endian `u32` id, bytes 4..8 a little-endian `u32` payload length, then the payload. Write `pub struct FrameView<'a> { buf: &'a [u8] }` — the `'a` is the API promise: accessors borrow the input, no copies. `pub fn new(buf: &'a [u8]) -> Result<FrameView<'a>, &'static str>` rejects a buffer shorter than 8, computes `total = 8 + len` with `checked_add` (reject overflow), rejects a buffer shorter than `total`, and stores `&buf[..total]`. Then the infallible accessors: `pub fn id(&self) -> u32` reading bytes 0..4 via `u32::from_le_bytes`, and `pub fn payload(&self) -> &'a [u8]` returning everything after the 8-byte header.",
        solution: `pub struct FrameView<'a> {
    buf: &'a [u8],
}

impl<'a> FrameView<'a> {
    pub fn new(buf: &'a [u8]) -> Result<FrameView<'a>, &'static str> {
        if buf.len() < 8 {
            return Err("shorter than header");
        }
        let len = u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]) as usize;
        let total = 8usize.checked_add(len).ok_or("length overflow")?;
        if buf.len() < total {
            return Err("shorter than declared frame");
        }
        Ok(FrameView { buf: &buf[..total] })
    }

    pub fn id(&self) -> u32 {
        u32::from_le_bytes([self.buf[0], self.buf[1], self.buf[2], self.buf[3]])
    }

    pub fn payload(&self) -> &'a [u8] {
        &self.buf[8..]
    }
}`,
      },
    },
  ],
  edges: [
    // tokio-uring spine: the completion-model ownership choreography
    { from: "ownership-map", to: "buf-result-tuple" },
    { from: "buf-result-tuple", to: "complete-consumes-self" },
    { from: "buf-result-tuple", to: "owned-slice-view" },
    { from: "buf-result-tuple", to: "checkout-handle" },
    { from: "complete-consumes-self", to: "drop-detach" },
    { from: "drop-detach", to: "fd-refcount" },
    { from: "checkout-handle", to: "fd-refcount" },
    // bytes/iggy spine: ownership contracts without a kernel in sight
    { from: "ownership-map", to: "freeze-transition" },
    { from: "freeze-transition", to: "cheap-clone-contract" },
    { from: "cheap-clone-contract", to: "validated-wire-views" },
    { from: "owned-slice-view", to: "validated-wire-views" },
    // Drills
    { from: "buf-result-tuple", to: "why-buffers-move" },
    { from: "buf-result-tuple", to: "rebind-ritual-output" },
    { from: "buf-result-tuple", to: "write-bufresult" },
    { from: "write-bufresult", to: "write-complete" },
    { from: "complete-consumes-self", to: "write-complete" },
    { from: "owned-slice-view", to: "write-slice" },
    { from: "drop-detach", to: "dropped-future-mcq" },
    { from: "checkout-handle", to: "checkout-output" },
    { from: "freeze-transition", to: "freeze-sound-mcq" },
    { from: "freeze-transition", to: "write-freeze" },
    { from: "cheap-clone-contract", to: "write-freeze" },
    { from: "cheap-clone-contract", to: "hyper-bytes-mcq" },
    { from: "validated-wire-views", to: "write-wire-view" },
    { from: "write-slice", to: "write-wire-view" },
  ],
};
