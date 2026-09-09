import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  generateCancelBreakChallenge,
  isCancelBreakChallengeCorrect,
} from "./cancel-break-challenge";

interface CancelBreakDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}

export function CancelBreakDialog({
  onCancel,
  onConfirm,
  open,
}: CancelBreakDialogProps) {
  const [challenge, setChallenge] = useState("");
  const [answer, setAnswer] = useState("");
  const [showWrongMessage, setShowWrongMessage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setChallenge(generateCancelBreakChallenge());
    setAnswer("");
    setShowWrongMessage(false);

    inputRef.current?.focus();
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isCancelBreakChallengeCorrect(challenge, answer)) {
      onConfirm();
      return;
    }

    setShowWrongMessage(true);
    setAnswer("");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onPointerDownOutside={(event) => {
          if (event.target === inputRef.current) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Confirm cancel break</DialogTitle>
          <DialogDescription>
            Type the following 32-character string to cancel this break.
          </DialogDescription>
        </DialogHeader>
        <div
          aria-label="Cancel break confirmation string"
          className="select-none break-all rounded-md border bg-muted p-3 font-mono text-sm"
          onCopy={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
          onSelect={(event) => event.preventDefault()}
        >
          {challenge}
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            aria-label="Confirmation string"
            autoComplete="off"
            autoFocus
            ref={inputRef}
            type="text"
            tabIndex={0}
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setShowWrongMessage(false);
            }}
          />
          {showWrongMessage && (
            <p className="text-sm text-destructive">wrong, try again.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Confirm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
