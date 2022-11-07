import 'wouter'

declare module 'wouter' {
  export interface RouterProps {
    navigationHistory?: NavigationHistory
  }

  export interface NavigationHistory {
    current?: NavigationHistoryItem
    previous?: NavigationHistoryItem
  }

  export interface NavigationHistoryItem {
    path: string
    replace: boolean
  }
}
