"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { evaluate } from 'mathjs'

interface CellValue {
  [key: string]: string
}

const ROWS = 30
const COLS = 20
const COL_HEADERS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i))

// Extracts numeric values from a column (e.g., "A" or "F")
const getColumnCells = (colLetter: string, data: CellValue): number[] => {
  const colIndex = colLetter.charCodeAt(0) - 65
  if (colIndex < 0 || colIndex >= COLS) return []
  
  const values: number[] = []
  for (let row = 0; row < ROWS; row++) {
    const key = `${colLetter}${row + 1}`
    const val = data[key]
    if (val && !val.startsWith("=")) {
      const num = Number.parseFloat(val)
      if (!Number.isNaN(num)) values.push(num)
    }
  }
  return values
}

// Extracts numeric values from a cell range (e.g., "A1:B10")
const getCellRange = (start: string, end: string, data: CellValue): number[] => {
  const startCol = start.charCodeAt(0) - 65
  const startRow = Number.parseInt(start.slice(1)) - 1
  const endCol = end.charCodeAt(0) - 65
  const endRow = Number.parseInt(end.slice(1)) - 1

  const values: number[] = []
  for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
    for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
      const key = `${String.fromCharCode(65 + c)}${r + 1}`
      const val = data[key]
      if (val && !val.startsWith("=")) {
        const num = Number.parseFloat(val)
        if (!Number.isNaN(num)) values.push(num)
      }
    }
  }
  return values
}

// Creates spreadsheet function implementations
const createFormulaContext = (data: CellValue) => ({
  SUM: (arg: string): number => {
    let values: number[] = []
    
    // Handle column reference (e.g., "F:F")
    if (/^[A-J]:[A-J]$/.test(arg)) {
      const col = arg.charAt(0)
      values = getColumnCells(col, data)
    }
    // Handle range reference (e.g., "A1:B10")
    else if (arg.includes(":")) {
      const [start, end] = arg.split(":")
      values = getCellRange(start.trim(), end.trim(), data)
    }
    // Handle column reference (e.g., "F")
    else if (/^[A-J]$/.test(arg)) {
      values = getColumnCells(arg, data)
    }
    
    return values.reduce((a, b) => a + b, 0)
  },
  
  AVERAGE: (arg: string): number => {
    let values: number[] = []
    
    if (/^[A-J]:[A-J]$/.test(arg)) {
      const col = arg.charAt(0)
      values = getColumnCells(col, data)
    } else if (arg.includes(":")) {
      const [start, end] = arg.split(":")
      values = getCellRange(start.trim(), end.trim(), data)
    } else if (/^[A-J]$/.test(arg)) {
      values = getColumnCells(arg, data)
    }
    
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  },
  
  COUNT: (arg: string): number => {
    let values: number[] = []
    
    if (/^[A-J]:[A-J]$/.test(arg)) {
      const col = arg.charAt(0)
      values = getColumnCells(col, data)
    } else if (arg.includes(":")) {
      const [start, end] = arg.split(":")
      values = getCellRange(start.trim(), end.trim(), data)
    } else if (/^[A-J]$/.test(arg)) {
      values = getColumnCells(arg, data)
    }
    
    return values.length
  },
  
  MIN: (arg: string): number => {
    let values: number[] = []
    
    if (/^[A-J]:[A-J]$/.test(arg)) {
      const col = arg.charAt(0)
      values = getColumnCells(col, data)
    } else if (arg.includes(":")) {
      const [start, end] = arg.split(":")
      values = getCellRange(start.trim(), end.trim(), data)
    } else if (/^[A-J]$/.test(arg)) {
      values = getColumnCells(arg, data)
    }
    
    return values.length ? Math.min(...values) : 0
  },
  
  MAX: (arg: string): number => {
    let values: number[] = []
    
    if (/^[A-J]:[A-J]$/.test(arg)) {
      const col = arg.charAt(0)
      values = getColumnCells(col, data)
    } else if (arg.includes(":")) {
      const [start, end] = arg.split(":")
      values = getCellRange(start.trim(), end.trim(), data)
    } else if (/^[A-J]$/.test(arg)) {
      values = getColumnCells(arg, data)
    }
    
    return values.length ? Math.max(...values) : 0
  },
})

// Evaluates a formula with support for functions and cell references
const evaluateFormula = (formula: string, data: CellValue, visitedCells = new Set<string>()): string => {
  try {
    let expression = formula.slice(1).trim()
    
    // Step 1: Replace spreadsheet functions (SUM, AVERAGE, etc.) with their numeric results
    const functionRegex = /(SUM|AVERAGE|COUNT|MIN|MAX)\s*\(\s*([^)]+)\s*\)/gi
    expression = expression.replace(functionRegex, (match, funcName, arg) => {
      const fn = funcName.toUpperCase()
      const context = createFormulaContext(data)
      const funcMap = context as Record<string, (arg: string) => number>
      
      if (funcMap[fn]) {
        try {
          const result = funcMap[fn](arg.trim())
          return String(result)
        } catch (err) {
          console.error(`Error in ${fn}(${arg}):`, err)
          return "0"
        }
      }
      return "0"
    })

    // Step 2: Replace cell references with their evaluated values
    const cellRefRegex = /([A-J])(\d+)/g
    expression = expression.replace(cellRefRegex, (match, col, row) => {
      const cellKey = `${col}${row}`
      
      // Detect circular references
      if (visitedCells.has(cellKey)) {
        throw new Error("Circular reference detected")
      }
      
      const cellValue = data[cellKey] || "0"
      
      // If the referenced cell contains a formula, evaluate it recursively
      if (cellValue.startsWith("=")) {
        const newVisited = new Set(visitedCells)
        newVisited.add(cellKey)
        return evaluateFormula(cellValue, data, newVisited)
      }
      
      // Return the numeric value or 0 if not a valid number
      const num = Number.parseFloat(cellValue)
      return Number.isNaN(num) ? "0" : String(num)
    })

    // Step 3: Evaluate the final mathematical expression
    const result = evaluate(expression)
    return String(result)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    console.error("Formula evaluation error:", errorMsg)
    return "#ERROR"
  }
}

export function Spreadsheet() {
  const [data, setData] = useState<CellValue>({})
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 })
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState("")
  const gridRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus and select input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  const getCellKey = (row: number, col: number): string => {
    return `${COL_HEADERS[col]}${row + 1}`
  }

  const getCellValue = (row: number, col: number): string => {
    const key = getCellKey(row, col)
    const rawValue = data[key] || ""

    if (rawValue.startsWith("=")) {
      return evaluateFormula(rawValue, data)
    }

    return rawValue
  }

  const handleCellClick = (row: number, col: number): void => {
    setSelectedCell({ row, col })
    setEditingCell(null)
  }

  const handleCellDoubleClick = (row: number, col: number): void => {
    const key = getCellKey(row, col)
    setEditingCell({ row, col })
    setEditValue(data[key] || "")
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (editingCell) {
      if (e.key === "Enter") {
        e.preventDefault()
        saveCellEdit()
        moveCell(1, 0)
        // Auto-start editing the next cell
        setTimeout(() => {
          const { row, col } = selectedCell
          const newRow = Math.max(0, Math.min(ROWS - 1, row + 1))
          setEditingCell({ row: newRow, col })
          setEditValue(data[getCellKey(newRow, col)] || "")
        }, 0)
      } else if (e.key === "Tab") {
        e.preventDefault()
        saveCellEdit()
        const delta = e.shiftKey ? -1 : 1
        moveCell(0, delta)
        // Auto-start editing the next cell after Tab
        setTimeout(() => {
          const { row, col } = selectedCell
          const newCol = Math.max(0, Math.min(COLS - 1, col + delta))
          setEditingCell({ row, col: newCol })
          setEditValue(data[getCellKey(row, newCol)] || "")
        }, 0)
      } else if (e.key === "Escape") {
        e.preventDefault()
        setEditingCell(null)
      }
    } else {
      const { row, col } = selectedCell

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          moveCell(-1, 0)
          break
        case "ArrowDown":
          e.preventDefault()
          moveCell(1, 0)
          break
        case "ArrowLeft":
          e.preventDefault()
          moveCell(0, -1)
          break
        case "ArrowRight":
          e.preventDefault()
          moveCell(0, 1)
          break
        case "Enter":
          e.preventDefault()
          handleCellDoubleClick(row, col)
          break
        case "Tab":
          e.preventDefault()
          const delta = e.shiftKey ? -1 : 1
          moveCell(0, delta)
          // Auto-start editing after Tab when not in edit mode
          setTimeout(() => {
            const newCol = Math.max(0, Math.min(COLS - 1, col + delta))
            setEditingCell({ row, col: newCol })
            setEditValue(data[getCellKey(row, newCol)] || "")
          }, 0)
          break
        case "Delete":
          e.preventDefault()
          deleteCell()
          break
        case "Backspace":
          e.preventDefault()
          handleCellDoubleClick(row, col)
          setEditValue("")
          break
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            setEditingCell({ row, col })
            setEditValue(e.key)
          }
      }
    }
  }

  const moveCell = (rowDelta: number, colDelta: number): void => {
    const newRow = Math.max(0, Math.min(ROWS - 1, selectedCell.row + rowDelta))
    const newCol = Math.max(0, Math.min(COLS - 1, selectedCell.col + colDelta))
    setSelectedCell({ row: newRow, col: newCol })
    setEditingCell(null)
  }

  const saveCellEdit = (): void => {
    if (editingCell === null) return

    const key = getCellKey(editingCell.row, editingCell.col)
    const newData = { ...data }

    if (editValue.trim() === "") {
      delete newData[key]
    } else {
      newData[key] = editValue
    }

    setData(newData)
    setEditingCell(null)
  }

  const deleteCell = (): void => {
    const key = getCellKey(selectedCell.row, selectedCell.col)
    const newData = { ...data }
    delete newData[key]
    setData(newData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEditValue(e.target.value)
  }

  return (
    <div className="overflow-auto p-4 bg-gray-50 min-h-screen" tabIndex={0} onKeyDown={handleKeyDown} ref={gridRef}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Excel-like Spreadsheet</h1>
        <p className="text-sm text-gray-600">
          A functional spreadsheet with formulas, cell references, and keyboard navigation
        </p>
      </div>

      <table className="border-collapse border border-gray-300 bg-white shadow-sm">
        <thead>
          <tr>
            <th className="w-12 h-8 border border-gray-300 bg-gray-100 text-xs font-semibold text-center sticky left-0 z-10"></th>
            {COL_HEADERS.map((col) => (
              <th
                key={col}
                className="w-24 h-8 border border-gray-300 bg-gray-100 text-xs font-semibold text-center font-mono"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROWS }).map((_, row) => (
            <tr key={row}>
              <td className="w-12 h-8 border border-gray-300 bg-gray-100 text-xs font-semibold text-center font-mono sticky left-0 z-10">
                {row + 1}
              </td>
              {Array.from({ length: COLS }).map((_, col) => {
                const key = getCellKey(row, col)
                const isSelected = selectedCell.row === row && selectedCell.col === col
                const isEditing = editingCell?.row === row && editingCell?.col === col

                return (
                  <td
                    key={key}
                    className={`w-24 h-8 border border-gray-300 p-0 cursor-cell font-mono text-sm ${
                      isSelected && !isEditing ? "ring-2 ring-blue-500 ring-inset" : ""
                    } ${isEditing ? "bg-blue-50" : "bg-white hover:bg-gray-50"}`}
                    onClick={() => handleCellClick(row, col)}
                    onDoubleClick={() => handleCellDoubleClick(row, col)}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onBlur={saveCellEdit}
                        className="w-full h-full px-2 py-1 border-0 outline-0 font-mono text-sm bg-white"
                      />
                    ) : (
                      <div className="px-2 py-1 truncate text-gray-800">{getCellValue(row, col)}</div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}