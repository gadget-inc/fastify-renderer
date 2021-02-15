import { unstable_useTransition as useTransition } from 'react'
import useLocation, { LocationHook } from 'wouter/use-location'

// custom wouter location management hook that uses React Concurrent Mode transitions to change location nicely for the user
export const useTransitionLocation: LocationHook = () => {
  const [location, setLocationSync] = useLocation()
  const [startTransition] = useTransition()

  const setLocation = (to: string, options: any) => {
    startTransition(() => {
      setLocationSync(to, options)
    })
  }

  return [location, setLocation]
}
