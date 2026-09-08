import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import type { RunnerBlock } from "@/lib/task-runner/types";

/** תוכן לימודי גנרי שמוצג בעמוד לפני השאלות — לפי הגדרת המשימה. */
export function ContentBlocks({
  blocks,
  renderSpeak,
}: {
  blocks: RunnerBlock[];
  renderSpeak?: ((id: string, text: string) => ReactNode) | undefined;
}) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} index={index} renderSpeak={renderSpeak} />
      ))}
    </div>
  );
}

function BlockView({
  block,
  index,
  renderSpeak,
}: {
  block: RunnerBlock;
  index: number;
  renderSpeak?: ((id: string, text: string) => ReactNode) | undefined;
}) {
  if (block.kind === "text") {
    return (
      <article className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          {block.title && <h3 className="text-lg font-bold">{block.title}</h3>}
          {renderSpeak?.(`block-${index}`, block.body)}
        </div>
        <p className="reading-text mt-2 whitespace-pre-wrap">{block.body}</p>
      </article>
    );
  }

  if (block.kind === "steps") {
    return (
      <article className="rounded-3xl border border-border bg-card p-6">
        {block.title && <h3 className="text-lg font-bold">{block.title}</h3>}
        <ol className="mt-3 space-y-3">
          {block.steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-bold">{step.title}</p>
                <p className="reading-text text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    );
  }

  if (block.kind === "example") {
    return (
      <article className="rounded-3xl border border-primary/30 bg-accent/40 p-6">
        <div className="flex items-start justify-between gap-3">
          {block.title && <h3 className="text-lg font-bold text-primary">{block.title}</h3>}
          {renderSpeak?.(`block-${index}`, block.paragraph)}
        </div>
        <p className="reading-text mt-2">{block.paragraph}</p>
        <dl className="mt-4 space-y-2">
          {block.lines.map((line) => (
            <div key={line.label} className="rounded-2xl border border-border bg-card p-3">
              <dt className="text-sm font-semibold text-primary">{line.label}</dt>
              <dd className="reading-text">{line.value}</dd>
            </div>
          ))}
        </dl>
      </article>
    );
  }

  if (block.kind === "terms") {
    return (
      <article className="rounded-3xl border border-border bg-card p-6">
        {block.title && <h3 className="text-lg font-bold">{block.title}</h3>}
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {block.terms.map((term) => (
            <div key={term.title} className="rounded-2xl border border-border bg-secondary/40 p-3">
              <dt className="font-bold text-primary">{term.title}</dt>
              <dd className="reading-text mt-1">{term.body}</dd>
            </div>
          ))}
        </dl>
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-border bg-card p-6">
      {block.title && <h3 className="text-lg font-bold">{block.title}</h3>}
      <ul className="mt-3 space-y-2">
        {block.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <span className="reading-text">{item.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
