import React, { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { cn } from '../../lib/utils'

const DropdownMenu = ({ className, ...props }) => (
  <Menu as="div" className={cn("relative", className)} {...props} />
)

const DropdownMenuTrigger = Menu.Button

const DropdownMenuContent = ({ className, children, align = "end", ...props }) => {
  return (
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items
        className={cn(
          "absolute z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg focus:outline-none",
          align === "end" ? "right-0" : "left-0",
          className
        )}
        {...props}
      >
        <div className="p-1">{children}</div>
      </Menu.Items>
    </Transition>
  )
}

const DropdownMenuItem = ({ className, children, onClick, ...props }) => {
  return (
    <Menu.Item>
      {({ active }) => (
        <button
          onClick={onClick}
          className={cn(
            "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
            active ? "bg-gray-100 text-gray-900" : "text-gray-700",
            className
          )}
          {...props}
        >
          {children}
        </button>
      )}
    </Menu.Item>
  )
}

const DropdownMenuLabel = ({ className, ...props }) => (
  <div
    className={cn("px-2 py-1.5 text-sm font-semibold text-gray-900", className)}
    {...props}
  />
)

const DropdownMenuSeparator = ({ className, ...props }) => (
  <div className={cn("-mx-1 my-1 h-px bg-gray-100", className)} {...props} />
)

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
