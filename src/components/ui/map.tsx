/* eslint-disable */
"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { cn } from "@/lib/utils"

interface MapProps {
  center?: [number, number]
  zoom?: number
  style?: string
  className?: string
  markers?: MapMarker[]
  onMapLoad?: (map: mapboxgl.Map) => void
  onMarkerClick?: (marker: MapMarker) => void
}

export interface MapMarker {
  id: string
  coordinates: [number, number]
  title: string
  description?: string
  sportTypes?: string[]
  pricePerHour?: number
  imageUrl?: string
  onClick?: () => void
}

export function Map({
  center = [77.5946, 12.9716],
  zoom = 12,
  style = "mapbox://styles/mapbox/streets-v12",
  className,
  markers = [],
  onMapLoad,
  onMarkerClick,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      setMapError("Mapbox token not configured")
      return
    }

    mapboxgl.accessToken = token

    if (!mapContainer.current || map.current) return

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style,
        center,
        zoom,
      })

      map.current = mapInstance

      mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right")
      mapInstance.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        "top-right"
      )

      mapInstance.on("load", () => {
        onMapLoad?.(mapInstance)
      })

      mapInstance.on("error", (e) => {
        console.error("Map error:", e)
        setMapError("Failed to load map")
      })
    } catch (error) {
      console.error("Map initialization error:", error)
      setMapError("Failed to initialize map")
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [center, zoom, style])

  useEffect(() => {
    if (!map.current) return

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add new markers
    markers.forEach((markerData) => {
      const el = document.createElement("div")
      el.className = "map-marker"
      el.innerHTML = `
        <div class="relative">
          <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/>
            </svg>
          </div>
          ${markerData.pricePerHour ? `<span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap">₹${markerData.pricePerHour}/hr</span>` : ""}
        </div>
      `

      const marker = new mapboxgl.Marker(el)
        .setLngLat(markerData.coordinates)
        .addTo(map.current!)

      const popupHtml = "<div class=\"p-2 min-w-[200px]\">" +
        "<h3 class=\"font-semibold text-gray-900\">" + markerData.title + "</h3>" +
        (markerData.description ? "<p class=\"text-sm text-gray-600 mt-1\">" + markerData.description + "</p>" : "") +
        (markerData.sportTypes?.length ? "<p class=\"text-sm text-gray-500 mt-1\">" + markerData.sportTypes.join(", ") + "</p>" : "") +
        (markerData.pricePerHour ? "<p class=\"text-sm font-semibold text-primary mt-1\">₹" + markerData.pricePerHour + "/hour</p>" : "") +
        "</div>"
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml)

      marker.setPopup(popup)
      marker.getElement().addEventListener("click", () => {
        onMarkerClick?.(markerData)
        markerData.onClick?.()
      })

      markersRef.current.push(marker)
    })
  }, [markers, onMarkerClick])

  if (mapError) {
    return (
      <div className={cn("relative h-96 w-full bg-gray-100 rounded-lg flex items-center justify-center", className)}>
        <div className="text-center p-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="mt-2 text-gray-600">{mapError}</p>
          <p className="text-sm text-gray-500">Please configure NEXT_PUBLIC_MAPBOX_TOKEN</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className={cn("relative h-96 w-full rounded-lg", className)}
      style={{ height: "400px" }}
    />
  )
}

export function MapSearch({
  center = [77.5946, 12.9716],
  zoom = 12,
  onLocationSelect,
  className,
}: {
  center?: [number, number]
  zoom?: number
  onLocationSelect: (coordinates: [number, number], address: string) => void
  className?: string
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      setMapError("Mapbox token not configured")
      return
    }

    mapboxgl.accessToken = token

    if (!mapContainer.current || map.current) return

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
      })

      map.current = mapInstance
      mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right")

      mapInstance.on("click", async (e) => {
        const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat]
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${token}&types=address,place,poi`
          )
          const data = await response.json()
          const address = data.features[0]?.place_name || `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`
          
          if (markerRef.current) {
            markerRef.current.remove()
          }
          
          markerRef.current = new mapboxgl.Marker({ color: "#3b82f6" })
            .setLngLat(coordinates)
            .addTo(mapInstance)
          
          onLocationSelect(coordinates, address)
        } catch (error) {
          console.error("Reverse geocoding error:", error)
        }
      })
    } catch (error) {
      console.error("Map initialization error:", error)
      setMapError("Failed to initialize map")
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [center, zoom, onLocationSelect])

  if (mapError) {
    return (
      <div className={cn("relative h-96 w-full bg-gray-100 rounded-lg flex items-center justify-center", className)}>
        <p className="text-gray-600">{mapError}</p>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className={cn("relative h-96 w-full rounded-lg", className)}
      style={{ height: "400px" }}
    />
  )
}