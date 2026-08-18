"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { IconButton, Input } from "@/components/ui/primitives";

export function PasswordInput({ showLabel, hideLabel, ...props }: React.ComponentProps<typeof Input> & { showLabel: string; hideLabel: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="relative"><Input {...props} type={visible ? "text" : "password"} /><IconButton className="absolute right-1 top-1/2 -translate-y-1/2 border-0" type="button" label={visible ? hideLabel : showLabel} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff /> : <Eye />}</IconButton></div>;
}

export function RadioGroup({ name, label, options, defaultValue }: { name: string; label: string; options: Array<{ value: string; label: string; description?: string }>; defaultValue?: string }) {
  return <fieldset><legend className="field-label">{label}</legend><div className="grid gap-2 mt-2">{options.map((option) => <label className="choice-card" key={option.value}><input type="radio" name={name} value={option.value} defaultChecked={option.value === defaultValue} /><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</label>)}</div></fieldset>;
}
