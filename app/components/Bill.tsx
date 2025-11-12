"use client"

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react"

interface RowData {
  id: number
  item: string
  quantity: number
  price: number
}

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`px-4 py-2 rounded font-medium transition-colors ${className}`}
        {...props}
      />
    )
  }
)

export default function Bill() {
  const [rows, setRows] = useState<RowData[]>([{ id: 1, item: "", quantity: 0, price: 0 }])
  const [nextId, setNextId] = useState(2)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const cellRefs = useRef<Record<string, HTMLInputElement>>({})

  // Calculate total for a row
  const calculateRowTotal = (row: RowData): number => {
    return row.quantity * row.price
  }

  // Calculate grand total
  const grandTotal = rows.reduce((sum, row) => sum + calculateRowTotal(row), 0)

  // Check if a row is filled (has data)
  const isRowFilled = (row: RowData): boolean => {
    return row.item.trim() !== "" || row.quantity > 0 || row.price > 0
  }

  // Register cell ref
  const registerCellRef = useCallback((ref: HTMLInputElement | null, rowId: number, col: string) => {
    if (ref) {
      cellRefs.current[`cell-${rowId}-${col}`] = ref
    }
  }, [])

  // Focus a specific cell
  const focusCell = useCallback((rowId: number, col: string) => {
    const ref = cellRefs.current[`cell-${rowId}-${col}`]
    if (ref) {
      ref.focus()
      ref.select?.()
    }
  }, [])

  // Handle Enter key navigation
  const handleEnter = useCallback(
    (rowIndex: number, colIndex: number) => {
      const currentRow = rows[rowIndex]
      const cols = ["item", "quantity", "price"]

      if (colIndex < cols.length - 1) {
        // Move to next column
        focusCell(currentRow.id, cols[colIndex + 1])
      } else if (isRowFilled(currentRow)) {
        // If row is filled and we're at the last column
        if (rowIndex === rows.length - 1) {
          // Only create new row if we're on the last row
          const newRow: RowData = { id: nextId, item: "", quantity: 0, price: 0 }
          setRows([...rows, newRow])
          setNextId(nextId + 1)
          // Focus will be handled by useEffect after row is added
        } else {
          // If not on last row, move to first cell of next row
          focusCell(rows[rowIndex + 1].id, cols[0])
        }
      } else {
        // If row is empty, focus submit button
        submitButtonRef.current?.focus()
      }
    },
    [rows, nextId, focusCell],
  )

  // Handle input change
  const handleInputChange = (rowId: number, field: "item" | "quantity" | "price", value: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          if (field === "item") {
            return { ...row, item: value }
          } else {
            const numValue = value === "" ? 0 : Number.parseFloat(value)
            return { ...row, [field]: isNaN(numValue) ? 0 : numValue }
          }
        }
        return row
      }),
    )
  }

  // Handle key down for navigation
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    const cols = ["item", "quantity", "price"]
    
    if (e.key === "Tab") {
      // Prevent tab from leaving the table
      if (e.shiftKey) {
        // Shift+Tab - move backwards
        e.preventDefault()
        if (colIndex > 0) {
          focusCell(rows[rowIndex].id, cols[colIndex - 1])
        } else if (rowIndex > 0) {
          // Move to last cell of previous row
          focusCell(rows[rowIndex - 1].id, cols[cols.length - 1])
        }
        // If at first cell of first row, stay there
      } else {
        // Tab - move forwards
        e.preventDefault()
        if (colIndex < cols.length - 1) {
          focusCell(rows[rowIndex].id, cols[colIndex + 1])
        } else if (rowIndex < rows.length - 1) {
          // Move to first cell of next row
          focusCell(rows[rowIndex + 1].id, cols[0])
        } else {
          // If on last cell of last row, create new row if current row has data
          const currentRow = rows[rowIndex]
          if (isRowFilled(currentRow)) {
            const newRow: RowData = { id: nextId, item: "", quantity: 0, price: 0 }
            setRows([...rows, newRow])
            setNextId(nextId + 1)
          } else {
            // Focus submit button if row is empty
            submitButtonRef.current?.focus()
          }
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      handleEnter(rowIndex, colIndex)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (rowIndex > 0) {
        focusCell(rows[rowIndex - 1].id, cols[colIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (rowIndex < rows.length - 1) {
        focusCell(rows[rowIndex + 1].id, cols[colIndex])
      } else {
        // If on last row and arrow down, create new row
        const currentRow = rows[rowIndex]
        if (isRowFilled(currentRow)) {
          const newRow: RowData = { id: nextId, item: "", quantity: 0, price: 0 }
          setRows([...rows, newRow])
          setNextId(nextId + 1)
          // Focus will be handled by useEffect
        }
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      if (colIndex > 0) {
        focusCell(rows[rowIndex].id, cols[colIndex - 1])
      } else if (rowIndex > 0) {
        // Move to last cell of previous row
        focusCell(rows[rowIndex - 1].id, cols[cols.length - 1])
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      if (colIndex < cols.length - 1) {
        focusCell(rows[rowIndex].id, cols[colIndex + 1])
      } else if (rowIndex < rows.length - 1) {
        // Move to first cell of next row
        focusCell(rows[rowIndex + 1].id, cols[0])
      } else {
        // If on last cell of last row, create new row if current row has data
        const currentRow = rows[rowIndex]
        if (isRowFilled(currentRow)) {
          const newRow: RowData = { id: nextId, item: "", quantity: 0, price: 0 }
          setRows([...rows, newRow])
          setNextId(nextId + 1)
          // Focus will be handled by useEffect
        }
      }
    }
  }

  // Handle submit
  const handleSubmit = () => {
    const nonEmptyRows = rows.filter((row) => isRowFilled(row))
    console.log(JSON.stringify(nonEmptyRows, null, 2))
    alert("Billing data logged to console")
  }

  // Check if there's at least one filled row
  const hasData = rows.some((row) => isRowFilled(row))

  // Focus first cell on mount
  useEffect(() => {
    focusCell(rows[0].id, "item")
  }, [])

  // Focus the first cell of the last row when a new row is added
  useEffect(() => {
    if (rows.length > 1) {
      const lastRow = rows[rows.length - 1]
      focusCell(lastRow.id, "item")
    }
  }, [rows.length])

  const cols = ["item", "quantity", "price"] as const
  const colLabels = { item: "Item", quantity: "Quantity", price: "Price" }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">No</th>
                {cols.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-semibold text-slate-700">
                    {colLabels[col]}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{rowIndex + 1}</td>
                  {cols.map((col, colIndex) => (
                    <td key={`${row.id}-${col}`} className="px-4 py-3">
                      <input
                        ref={(el) => registerCellRef(el, row.id, col)}
                        type={col === "item" ? "text" : "number"}
                        value={row[col]}
                        onChange={(e) => handleInputChange(row.id, col, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        placeholder={col === "item" ? "—" : "0"}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {calculateRowTotal(row).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <div className="space-y-2">
            <div className="flex gap-8">
              <span className="font-semibold text-slate-700">Grand Total:</span>
              <span className="font-bold text-blue-600">Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            ref={submitButtonRef}
            onClick={handleSubmit}
            disabled={!hasData}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}