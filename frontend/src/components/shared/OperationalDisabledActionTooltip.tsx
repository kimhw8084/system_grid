import React, { useId } from 'react'

export function OperationalDisabledActionTooltip({
  disabled,
  reason,
  children,
  className,
}: {
  disabled?: boolean
  reason?: string
  children: React.ReactNode
  className?: string
}) {
  const tooltipId = useId()

  if (!disabled || !reason) {
    return <>{children}</>
  }

  return (
    <span
      className={className}
      tabIndex={0}
      title={reason}
      aria-describedby={tooltipId}
      data-disabled-tooltip-host="true"
    >
      <span id={tooltipId} className="sr-only">
        {reason}
      </span>
      {children}
    </span>
  )
}
