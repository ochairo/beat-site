<!-- markdownlint-disable MD013 -->
# Beat vs React + Vite

React + Vite is a strong default. It has a larger ecosystem, broader team
familiarity, and far more third-party integrations than Beat.

This page is narrower: what changes when a medium-sized app starts to have
live updates, route data, and UI that should stay easy to reason about.

## The scenario

Assume an app with:

- a dashboard route with params and loaders
- a notifications badge updated from a socket
- a messages list with filters
- async panels that can reload independently

This is where React still works well, but the amount of coordination work
usually starts to grow.

## React + Vite: the normal path

Vite gives React a fast build and dev experience. After that, you usually
assemble the rest: routing, async data, and state patterns.

```tsx
import { memo, useEffect, useState } from "react";

const MessagesPanel = memo(function MessagesPanel({
  messages,
}: {
  messages: Message[];
}) {
  return <ul>{messages.map((message) => <li key={message.id}>{message.text}</li>)}</ul>;
});

function Dashboard({ socket }: { socket: WebSocket }) {
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "notification") {
        setNotifications((n) => n + 1);
      }
      if (data.type === "message") {
        setMessages((items) => [...items, data.message]);
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [socket]);

  return (
    <>
      <NotificationBadge count={notifications} />
      <MessagesPanel messages={messages} />
    </>
  );
}
```

This is normal React. It works. But the default update unit is still the
component. As screens grow, you start caring more about rerender boundaries,
memoization, and how separate router/data/state libraries fit together.

## Beat: the default stays local

```tsx
import { onCleanup } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

function Dashboard({ socket }: { socket: WebSocket }) {
  const notifications = pulse(0);
  const messages = pulse<Message[]>([]);

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "notification") {
      notifications.set((n) => n + 1);
    }
    if (data.type === "message") {
      messages.set((items) => [...items, data.message]);
    }
  };

  onCleanup(() => {
    socket.onmessage = null;
  });

  return (
    <>
      <NotificationBadge count={notifications} />
      <MessagesPanel messages={messages} />
    </>
  );
}
```

A Beat component behaves like setup code. Pulse updates only the bindings that
depend on changed values. Routing and async resources stay in Beat APIs instead
of being assembled from separate layers.

## What changes in practice

| Concern | React + Vite | Beat |
| - | - | - |
| Update unit | A state change reruns the component | A component sets up once; affected bindings update |
| Isolation | Add memoization when rerender cost matters | Local updates are the default |
| Router and async state | Usually chosen from separate libraries | Built into the framework |
| Debugging | Trace rerenders, effects, and library boundaries | Trace explicit bindings, pulses, and route/resource state |
| Ecosystem | Large and mature | Small and focused |

## When Beat is the better fit

- You care more about predictable local updates than ecosystem breadth
- You want routing and async resources in the same runtime model
- You prefer explicit subscriptions over runtime auto-tracking

## When React + Vite is the better fit

- You need the widest possible ecosystem
- Your team already has strong React conventions and tooling
- You want to mix and match router, server-state, and state libraries freely

If Beat's runtime model is the part you want, continue with Quick Start,
Integration, and API first. The architecture guides are optional patterns you
can layer on later: [Clean Architecture](./clean-architecture) and
[Plugin Architecture](./plugin-architecture).
