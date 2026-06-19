import { NextResponse } from "next/server";

let remoteCommand = null;

export async function POST(request) {
try {
const body = await request.json();

```
if (body.slideNumber !== undefined) {
  remoteCommand = {
    slideNumber: body.slideNumber,
    timestamp: Date.now(),
  };

  return NextResponse.json({
    success: true,
    command: remoteCommand,
  });
}

return NextResponse.json(
  { error: "Invalid payload" },
  { status: 400 }
);
```

} catch (error) {
console.error(error);

```
return NextResponse.json(
  { error: "Server error" },
  { status: 500 }
);
```

}
}

export async function GET() {
return NextResponse.json({
command: remoteCommand,
});
}
