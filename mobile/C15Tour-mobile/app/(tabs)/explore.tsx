import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/theme';
import { useAuth } from '@/context/auth';
import HomeButton from '@/components/ui/HomeButton';
import MicButton from '@/components/ui/MicButton';
import ConvoyName from '@/components/ui/ConvoyName';
import { API_BASE_URL } from '@/constants/api';
import MicIcon from '../../../../shared/global_assets/pictos/Mic.svg';
import MicMutedIcon from '../../../../shared/global_assets/pictos/MicMuted.svg';
import { getLocation, startHeadingTracking, startTracking, stopTracking } from '../services/locations/locationService';
import ScrollUpItinerary from '@/components/ui/scroll-up-itinerary';
import {
  computeDistanceToStart,
  computeGuidance,
  computeTripRoute,
  Coordinates,
  fetchTripSteps,
  GuidanceResult,
  reverseGeocodeStreetName,
  RouteGeometry,
  RouteSummary,
  TripStep
} from '../services/itinerary/ItineraryService';


const MIC_STATUS_COLORS = {
  idle: '#CCCCCC',
  live: '#1DAD63',
  muted: '#D64545',
} as const;

const ITINERARY_CLOSED_RATIO = 0.15;
const ITINERARY_CONTROL_GAP = 50;

const LEADER_ICON_URL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNDciIHZpZXdCb3g9IjAgMCA1MiA0NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxwYXRoIGQ9Ik0xMi4xODM1IDE3LjAxMzNDMTEuNTk4NiAxNS4zMTI0IDExLjUzMjEgMTMuMTYyNSAxMi4wNjg4IDExLjM2MTdMMTIuMTgzNSAxMS4wMDY1TDEyLjE4ODUgMTAuOTkxNUwxMi4xOTM1IDEwLjk3NzhDMTIuNjMxOSA5Ljc4MDM5IDEzLjUwNjcgOC45MzQyOSAxNC41OTk5IDguNTQyNjhDMTQuNjQzNSA4LjAxMjY0IDE0LjY5NDEgNy40ODkyOSAxNC43NDk1IDYuOTc4NjZDMTQuODMyOCA2LjIwOTk3IDE0LjkzNTggNC45OTk1NiAxNS4zMDAzIDMuODY0MzNMMTUuNDUzNiAzLjQzNTYyQzE1LjY0NDQgMi45NTc3OCAxNS45NiAyLjM1MzUgMTYuNTA1NCAxLjgyNDI1QzE3LjMxMzQgMS4wNDAyMyAxOC40Mzg1IDAuNzE1MzIgMTkuMTA4OCAwLjU1MzA4OUMxOS45MTgzIDAuMzU3MjYyIDIwLjgyNDMgMC4yMzQ3MTYgMjEuNjY5OCAwLjE1NTU0MUMyMS45MDg1IDAuMTMzMTkgMjIuMTQ4MyAwLjExNTAxOCAyMi4zODY0IDAuMDk4MjE0TDIyLjk5NDUgMC4wNjEwMjAxQzI0LjIyMzMgLTAuMDA1MDM5MzQgMjUuMzQ3OCAtMC4wMDgxMzQwMiAyNi4wMDA1IDAuMDA4NDg1MTFDMjYuMDc2NCAwLjAxMDQxMSAyNi4xNTk3IDAuMDE0NDE3NSAyNi4yNDk3IDAuMDE3MjA4N1YwLjAwODQ4NTA4TDI2LjI2MjIgMC4wMTcyMDg3QzI2Ljk2MzMgMC4wMzkxNzExIDI4LjA1NzkgMC4wOTA4MzY3IDI5LjEzNzIgMC4yNDc3NjJDMjkuNzQ3NiAwLjMzNjUxNCAzMC40MjkyIDAuNDY4MTA5IDMxLjA2NjQgMC42Nzc3MTFDMzEuNTY2OSAwLjg0MjM2NSAzMi4yODY5IDEuMTMxMDMgMzIuOTAzMyAxLjY3NDdMMzMuMTYwMSAxLjkyMzk0QzMzLjgxMDEgMi42MTc2OSAzNC4wNDE4IDMuNDUyNjMgMzQuMTI3MSAzLjc4MDgzQzM0LjM0MjIgNC42MDgzNiAzNC40MDUzIDUuNDkxMDcgMzQuNDUzNyA1Ljk4NDE3QzM0LjU0NDEgNi45MDcyOCAzNC41OTUyIDcuODMxMDQgMzQuNjM0NCA4LjczMjExQzM1LjYyNDQgOS4xOTk5NiAzNi4yMzQ2IDkuOTc2NDQgMzYuNTg5NyAxMC42OTk5QzM3LjIzNDEgMTIuMDEzMyAzNy4yNDQ5IDEzLjU1NjQgMzcuMjE5IDE0LjQyMTJDMzcuMjA0NiAxNC45MDQxIDM3LjE3MjEgMTUuNjQ0IDM2Ljk4MzUgMTYuNDIyNkwzNi44MDUzIDE3LjAxODNDMzYuNzA4IDE3LjI5MzcgMzYuNTg5NiAxNy41Njc5IDM2LjQzODkgMTcuODI5NkMzNi4xMTcgMTguMzg4NCAzNS42MzYyIDE4LjkzMjggMzQuOTYyMSAxOS4zMjEzQzM0Ljk4ODIgMTkuNDA4MyAzNS4wMTE5IDE5LjQ4NSAzNS4wMjgyIDE5LjU1MDZDMzUuMTMzNCAxOS45NzQ0IDM1LjE4MDcgMjAuMzk4NyAzNS4yMDUxIDIwLjczNThDMzUuMjE1NCAyMC44NzggMzUuMjIxMSAyMS4wMjU5IDM1LjIyNjMgMjEuMTcyTDM1LjI0NjMgMjQuNTkxN0wzNS4yNSAyNS4zODkyVjI1LjM5NDJMMzUuMjU3NSAzMC4wNzg4QzM1LjI1NzggMzAuMzg0OCAzNS4yNTcxIDMwLjcxODUgMzUuMjU4NyAzMS4wNjIxQzM1LjQxODIgMzEuMTc3OSAzNS41NzU1IDMxLjMwNzggMzUuNzI0OCAzMS40NTg0QzM2LjA0ODcgMzEuNzg1MSAzNi4yOTY4IDMyLjE0NDEgMzYuNDg3NSAzMi41MDRDMzYuNjE0NyAzMi43NDM5IDM2LjcxNTggMzIuOTg0NSAzNi43OTc4IDMzLjIxNTZDMzYuOTIwOCAzMy41NjIgMzYuOTk5OSAzMy44ODc5IDM3LjA1MzMgMzQuMTYxNUMzNy4yMDYxIDM0Ljk0NTEgMzcuMjI2NiAzNS43MDk1IDM3LjIyNCAzNi4yMzE1QzM3LjIyMTcgMzYuNzAzOCAzNy4yMDQ0IDM3LjQ1NzQgMzcuMDYzMyAzOC4yMjc5QzM2Ljk4NDEgMzguNjU5NyAzNi44MzY1IDM5LjI3NDQgMzYuNTE3NCAzOS44OTE2QzM2LjQ1MzUgNDAuMDE1NCAzNi4zODI5IDQwLjEzOTMgMzYuMzA0MyA0MC4yNjE4QzM2LjE0NzUgNDAuNTA2MSAzNS45NTk5IDQwLjc0NTEgMzUuNzM0OCA0MC45NjcxQzM1LjU2ODcgNDEuMTMwOSAzNS4zOTY0IDQxLjI2OSAzNS4yMjM4IDQxLjM4ODRDMzUuMjE0NCA0MS42MzQ1IDM1LjIwNzUgNDEuODYwNSAzNS4yMDE0IDQyLjA1MjZDMzUuMTY0OCA0My4yMTA3IDM0Ljg4MzggNDQuODIzMiAzMy4zNzgyIDQ1Ljc3NTFDMzIuNzQwNSA0Ni4xNzgyIDMyLjA4NDkgNDYuMzE4MSAzMS42MTcyIDQ2LjM4MDhDMzEuMTU1IDQ2LjQ0MjYgMzAuNjcgNDYuNDUyMSAzMC4yOTg3IDQ2LjQ1OEMyNy40OTgyIDQ2LjUwMjkgMjQuNjgwOCA0Ni41MDAzIDIxLjkyMDMgNDYuNDk5MkMyMC45NTA0IDQ2LjUwMTYgMTkuOTggNDYuNDk5IDE5LjAxMDMgNDYuNDg5MkwxOS4wMDU0IDQ2LjQ4OEMxOC44MDQ0IDQ2LjQ4NTYgMTcuNjg0OSA0Ni41MzQzIDE2Ljc5MDggNDYuMzYwOEMxNi4yOTM4IDQ2LjI2NDMgMTUuNTk5IDQ2LjA2MjYgMTQuOTU2NCA0NS41NzgyQzE0LjI0MzcgNDUuMDQwNyAxMy43MjUyIDQ0LjI1MDQgMTMuNTU2OCA0My4yNzI3QzEzLjQzOCA0Mi41ODE3IDEzLjM5NjUgNDEuODM3OSAxMy4zODExIDQxLjE1NjZDMTIuNTU1NiA0MC40NTQgMTIuMjEyNCAzOS40NjM4IDEyLjA3NTEgMzkuMDIwNUMxMS44ODc3IDM4LjQxNTQgMTEuNzgxOCAzNy43ODExIDExLjc0OTggMzcuMjg3QzExLjcxMzMgMzYuNzIyOCAxMS42NjQ0IDM1LjgyNjIgMTEuNzUxIDM0LjkxMTdDMTEuODI1NyAzNC4xMjQ0IDEyLjAyOTkgMzIuOTMwOSAxMi43NjU1IDMxLjkxNDVMMTIuOTIgMzEuNzEzOUwxMy4wNjMzIDMxLjU0ODFDMTMuMTUyNiAzMS40NDk4IDEzLjI0ODEgMzEuMzU3IDEzLjM0NzUgMzEuMjY3N0wxMy4zNDg3IDI0Ljk2OEwxMy4zNzExIDIyLjYwMjdDMTMuMzcyNSAyMi4zNzc5IDEzLjMxMzIgMjEuMjA1MyAxMy40NjA5IDIwLjMwMDlDMTMuNTExOSAxOS45ODg3IDEzLjYwOTcgMTkuNTcyOSAxMy43OTI0IDE5LjEzNDRDMTMuMDU2NiAxOC42NDM1IDEyLjQ5MjggMTcuOTEyNCAxMi4xODM1IDE3LjAxMzNaIiBmaWxsPSJ3aGl0ZSIvPg0KPHBhdGggZD0iTTE1LjkyNDMgMzkuNTAyOUMxNS41OTIgMzkuNDkzNiAxNS4zMzAyIDM5LjQ0NDkgMTUuMDU5IDM5LjIzMzlDMTQuNTgyNSAzOC44NjMgMTQuMzM3MyAzNy43MjY3IDE0LjI5ODIgMzcuMTIyM0MxNC4yMjY3IDM2LjAxNjcgMTQuMTU0MSAzNC4yNDA3IDE0Ljg5ODQgMzMuMzI4M0MxNS4xODI4IDMyLjk3OTcgMTUuNDgyNiAzMi44ODkzIDE1Ljg5OTQgMzIuODUyOEwxNS45MDE5IDI0Ljk5MjVMMTUuOTIzOSAyMi42MjQ0QzE1LjkzMjEgMjEuNTczMSAxNS43MTI4IDE5LjY3NDkgMTYuOTg5OSAxOS4zMzYyQzE4LjE4NyAxOS4yMDk2IDE5LjYyNTYgMTkuMjA5NiAyMC44NDMzIDE5LjIwMDJMMjYuMjg4NiAxOS4yMDM2QzI3LjQzNTIgMTkuMjAzNiAyOC41ODE4IDE5LjIxMzYgMjkuNzI4MiAxOS4yMzRDMzAuMzQ2IDE5LjI0NCAzMC45NjQxIDE5LjIyMyAzMS41Nzc5IDE5LjMxMjVDMzEuODM4NyAxOS4zNTA2IDMyLjA4OTUgMTkuNDk3OSAzMi4zMDggMTkuNjM5OUMzMi43NDkgMjAuMTA1MiAzMi42ODAzIDIxLjY5MDYgMzIuNjg3MyAyMi4zNDE0TDMyLjY5ODIgMjUuMzk5NUwzMi43MDU5IDMwLjA4MzJDMzIuNzA2OCAzMC45NjQxIDMyLjcyMiAzMS45MDEyIDMyLjY5OTIgMzIuNzc2NkwzMi42OTczIDMyLjg0MzhDMzIuNzE4MSAzMi44NDMyIDMyLjczODkgMzIuODQyOSAzMi43NTk2IDMyLjg0MjhDMzMuMTc3MSAzMi44NDA0IDMzLjYxNCAzMi45NTM4IDMzLjkxMzQgMzMuMjU1N0MzNC41OTIyIDMzLjk0MDMgMzQuNjc3MSAzNS4zMDIzIDM0LjY3MjYgMzYuMjE5MkMzNC42NjgzIDM3LjA5MiAzNC42MDI2IDM4LjQ5OTkgMzMuOTQzMyAzOS4xNTAyQzMzLjU4NjEgMzkuNTAyNCAzMy4xNjMzIDM5LjUzNTQgMzIuNjk0MSAzOS41MzNDMzIuNzI5OSA0MC4zMzA3IDMyLjY3NjIgNDEuMjAyNCAzMi42NTE5IDQxLjk3MjlDMzIuNTk0IDQzLjgwNyAzMS44MDg4IDQzLjg4MiAzMC4yNTkyIDQzLjkwNjhDMjcuNDgzIDQzLjk1MTIgMjQuNjg3NCA0My45NDkxIDIxLjkyMjEgNDMuOTQ4QzIwLjk2MDQgNDMuOTUwNCAxOS45OTg3IDQzLjk0NjcgMTkuMDM3MSA0My45MzdDMTguMDgzIDQzLjkyNTUgMTYuMjg5NCA0NC4wOTkzIDE2LjA3MjggNDIuODQwMUMxNS44OTA4IDQxLjc4MTkgMTUuOTMxOCA0MC41ODA2IDE1LjkyNDMgMzkuNTAyOVoiIGZpbGw9IiNCMDI2ODkiLz4NCjxwYXRoIGQ9Ik0zMi42OTQgMzkuNTMyNkMzMi42OTE3IDM5LjE5MSAzMi42OTI3IDM4Ljg0OTQgMzIuNjk3MSAzOC41MDc5QzMyLjc5NDMgMzguNTA3OCAzMi45MzYgMzguNTEzOCAzMy4wMjczIDM4LjQ5NDZDMzIuOTM3NiAzOC40ODk0IDMyLjg2MjMgMzguNDgwNyAzMi43NzMxIDM4LjQ2OTJDMzIuNjg3NyAzOC4zODk0IDMyLjc0NDcgMzcuMzUwMiAzMi43NDY1IDM3LjE2ODlDMzIuNzUwNiAzNi40NjMgMzIuNzQ5NyAzNS43NTcxIDMyLjc0MzcgMzUuMDUxMkMzMi43NDE0IDM0LjcxODUgMzIuNzQ5MiAzNC4xOTY5IDMyLjcxMTEgMzMuODc4MUMzMi42NzggMzMuNzg5NiAzMi42OTU4IDMyLjk5NSAzMi42OTcxIDMyLjg0MzVDMzIuNzE3OSAzMi44NDI4IDMyLjczODcgMzIuODQyNSAzMi43NTk1IDMyLjg0MjRDMzMuMTc2OSAzMi44NDAxIDMzLjYxMzggMzIuOTUzNCAzMy45MTMyIDMzLjI1NTNDMzQuNTkyMSAzMy45Mzk5IDM0LjY3NjkgMzUuMzAxOSAzNC42NzI0IDM2LjIxODlDMzQuNjY4MSAzNy4wOTE2IDM0LjYwMjQgMzguNDk5NiAzMy45NDMxIDM5LjE0OThDMzMuNTg1OSAzOS41MDIgMzMuMTYzMSAzOS41MzUgMzIuNjk0IDM5LjUzMjZaIiBmaWxsPSIjOTIxOTcyIi8+DQo8cGF0aCBkPSJNMzMuMDI3MSAzOC40OTUxQzMyLjkzNzQgMzguNDg5OCAzMi44NjIxIDM4LjQ4MTEgMzIuNzcyOSAzOC40Njk3QzMyLjY4NzQgMzguMzg5OSAzMi43NDQ1IDM3LjM1MDcgMzIuNzQ2MyAzNy4xNjk0QzMyLjc1MDQgMzYuNDYzNSAzMi43NDk1IDM1Ljc1NzYgMzIuNzQzNSAzNS4wNTE3QzMyLjc0MTIgMzQuNzE4OSAzMi43NDkgMzQuMTk3NCAzMi43MTA5IDMzLjg3ODVDMzMuMDMxNCAzMy45MTM5IDMzLjI1NDggMzMuOTY2MyAzMy40NTQ4IDM0LjI0NTVDMzMuOTg5NCAzNC45OTE2IDMzLjk2NzcgMzYuMTQ0MiAzMy44ODEyIDM3LjAxOTVDMzMuODIxIDM3LjYyODYgMzMuNjMwNSAzOC4yNjM5IDMzLjAyNzEgMzguNDk1MVoiIGZpbGw9IiNERDQzQTIiLz4NCjxwYXRoIGQ9Ik0xNi43OTA0IDM5LjM3ODZDMTYuNzYxMyAzNS40NDg3IDE2Ljc1ODQgMzEuNTE4NSAxNi43ODE1IDI3LjU4ODVMMTYuODAyNSAyMy41ODFDMTYuODA2IDIyLjc5MjkgMTYuODAyOSAyMS45OTQ2IDE2LjgyODggMjEuMjA3MkMxNi44MzQgMjEuMDUwMiAxNi44NzA2IDIwLjU4ODMgMTYuOTY1MiAyMC40ODU3QzE3LjA2ODMgMjAuMzczOCAxNy4yNDU0IDIwLjI5MTggMTcuNDAzNCAyMC4yNzVDMTcuOTIwMyAyMC4yMTk2IDE4LjQ1NCAyMC4yMTg3IDE4Ljk3MyAyMC4yMDU5QzIwLjEzNzEgMjAuMTgyNyAyMS4zMDE1IDIwLjE3MTEgMjIuNDY1OSAyMC4xNzE4QzI0LjE4NjUgMjAuMTYzIDI1LjkwNzIgMjAuMTY2MSAyNy42Mjc4IDIwLjE4MTFDMjguNzEzOSAyMC4xODgzIDI5LjgyNiAyMC4yMDcxIDMwLjkxMjQgMjAuMjQ4N0MzMS4wMTYzIDIwLjI1NCAzMS40Mzc4IDIwLjMwOSAzMS40OTYxIDIwLjM3NTNDMzEuODI4NyAyMC43NTQzIDMxLjc2MzYgMjEuNDg2NCAzMS43Njg0IDIxLjk1ODlMMzEuNzgzNSAyMy42NjIxTDMxLjc5MjggMzUuNTA1NkwzMS43ODg2IDM5LjQyMDhDMzEuNzg2MiA0MC4yNTc4IDMxLjc4MTMgNDEuMTA4MSAzMS43NDcyIDQxLjk0NDVDMzEuNzQxMyA0Mi4wOTExIDMxLjcxMDEgNDIuNDEwOCAzMS42MDUzIDQyLjUxNDJDMzEuNDExMSA0Mi43MDU4IDMxLjIyODcgNDIuNzQ5NyAzMC45NjkzIDQyLjc2MjhDMzAuMTU2OCA0Mi44MDM4IDI5LjMzODkgNDIuNzg1MiAyOC41MjU2IDQyLjc5NjlMMjMuMzczMSA0Mi44NTEzTDE5LjU3NTMgNDIuODU2OUMxOC44NjI2IDQyLjg1NiAxOC4xMjc5IDQyLjg5MTcgMTcuNDE5MSA0Mi44MjU2QzE3LjI2OTYgNDIuODExNiAxNy4xMzUxIDQyLjc3OTkgMTcuMDIyMyA0Mi42NzIzQzE2LjcwODggNDIuMzczIDE2Ljc5NDYgMzkuOTA3NSAxNi43OTA0IDM5LjM3ODZaIiBmaWxsPSIjREQ0M0EyIi8+DQo8cGF0aCBkPSJNMTQuOTcyMiAzNi43MDQ5QzE0Ljk2MTEgMzYuNTQ1NSAxNC45NTQ3IDM2LjM4NTggMTQuOTUzIDM2LjIyNjFDMTQuOTQ3NyAzNS42NTE1IDE0Ljk5NjMgMzMuOTU1NSAxNS44MjIxIDMzLjk4NzdDMTUuOTA0NSAzNC4wODg2IDE1Ljg3MzkgMzUuNDE1MiAxNS44NzU4IDM1LjY1MjZDMTUuODkyMSAzNi4wNTkxIDE1Ljk1NTMgMzguMTQxNCAxNS44NzczIDM4LjQyNThDMTUuNzQ0OSAzOC40ODM4IDE1LjUyNzUgMzguMzc0NCAxNS40NDc1IDM4LjI3MDlDMTUuMTMwNiAzNy44NjEgMTUuMDI5NCAzNy4xOTExIDE0Ljk3MjIgMzYuNzA0OVoiIGZpbGw9IiNERDQzQTIiLz4NCjxwYXRoIGQ9Ik0xNi45OTM4IDE3LjA4QzE2LjAyODIgMTcuNDg5MyAxNC45NjU1IDE3LjI1NTEgMTQuNTk3MiAxNi4xODQ3QzE0LjE1MDkgMTQuODg3MiAxNC4xMzI5IDEzLjE1NDIgMTQuNTkwOSAxMS44NTYxQzE0Ljk5MTEgMTAuNzYyNiAxNi4wNTg3IDEwLjY3OTcgMTcuMDI1IDExLjA0MjVDMTcuMDQzNSA5Ljc4MTkzIDE3LjE1MDkgOC41MDgyNSAxNy4yODY3IDcuMjU1MjJDMTcuMzgwNyA2LjM4OTAxIDE3LjQ2MzIgNS40Nzg0IDE3LjczMDUgNC42NDU5NkMxNy44NDY3IDQuMjg0MTYgMTguMDA2OCAzLjkyNDU0IDE4LjI4MzYgMy42NTYyM0MxOS4zNjgxIDIuNjAzNjUgMjQuMzE0MiAyLjUxOTUzIDI1LjkzNTEgMi41NjA4QzI3LjIzMDIgMi41OTM2NCAzMC40MTI4IDIuNzI2MjMgMzEuMjk3OSAzLjY3MDYyQzMxLjQ4NDMgMy44Njk1IDMxLjU4OTUgNC4xNjQzOSAzMS42NTY5IDQuNDIzNjJDMzEuODA4NiA1LjAwNzE0IDMxLjg1NDggNS42MzU2OSAzMS45MTM1IDYuMjM0NTNDMzIuMDY3OSA3LjgxMDI4IDMyLjEwOTQgOS4zODc2IDMyLjE2NDggMTAuOTY4N0MzNC40NjY1IDEwLjQzMDIgMzQuNzE3OSAxMi42NjcgMzQuNjY3NyAxNC4zNDU2QzM0LjYxOTcgMTUuOTUxNyAzNC4zMzQ1IDE3LjY3MDEgMzIuMjkxNyAxNy4yNDc5TDMyLjI5MDIgMTguODQxNUMzMi4yOTAxIDE5LjAwMDMgMzIuMjgwOCAxOS41MDY5IDMyLjMwODEgMTkuNjQwMUMzMi4wODk2IDE5LjQ5ODIgMzEuODM4NyAxOS4zNTA5IDMxLjU3NzkgMTkuMzEyN0MzMC45NjQyIDE5LjIyMzMgMzAuMzQ2MSAxOS4yNDQyIDI5LjcyODIgMTkuMjM0MkMyOC41ODE4IDE5LjIxMzkgMjcuNDM1MiAxOS4yMDM5IDI2LjI4ODYgMTkuMjAzOUwyMC44NDM0IDE5LjIwMDVDMTkuNjI1NyAxOS4yMDk4IDE4LjE4NyAxOS4yMDk4IDE2Ljk4OTkgMTkuMzM2NUMxNi45OTEgMTguNjAyMyAxNi45NzU5IDE3LjgwOTUgMTYuOTkzOCAxNy4wOFoiIGZpbGw9IiM5MjE5NzIiLz4NCjxwYXRoIGQ9Ik0xNy42MjkyIDExLjU4NTZDMTcuNjkxMSAxMC4yMDAzIDE3Ljg0NTMgOC43ODc0OSAxOC4wMDMgNy40MUMxOC4wNDU3IDcuMDM3ODcgMTguMDkwNSA2LjYzNTQyIDE4LjE2MjQgNi4yNjg5MkMxOC45MzYyIDUuOTEwMjQgMTkuMTUyNyA1Ljc0MzU2IDE5LjgyNTYgNS4yMzQ3OEMxOS43MTk1IDYuMTQ3MjcgMTkuNjEgNy4wMzg4MSAxOS41NjcxIDcuOTU4NDlDMTkuNTU5IDguMTMyOTkgMTkuNTA0NiA4LjM1MjIgMTkuNjYyNyA4LjQ3ODIyTDE5LjcxMTUgOC40NjA0QzE5Ljg2MTMgOC4yMTE0OCAxOS45MzcgNi45NTc4MiAxOS45NzcgNi42MDU0QzIwLjA3NjMgNS42NjMyIDIwLjIzNDQgNC43Mjc4OCAyMC40NTA0IDMuODA1MzhDMjEuMTc5MiAzLjc0NzUzIDIxLjk2MjkgMy41ODgzNiAyMi43MjA5IDMuNTQxNDVDMjQuNjA2MyAzLjQyNDgxIDI3LjAyNzkgMy40MTQ4MSAyOC44OTU4IDMuNzQ2OUMyOS4xMzc0IDUuMTk4MiAyOS4xODQxIDYuNjk1NzcgMjkuMzYyIDguMTU2MTNDMjkuMzc1OSA4LjI2OTY0IDI5LjQwNDYgOC4zODQ0MSAyOS40NzQ0IDguNDc2MDNMMjkuNTI0MyA4LjQ4MTY2QzI5LjcwNzYgOC4yOTM0MSAyOS41OTg2IDcuNjYyMDQgMjkuNTc4NiA3LjM3NjIyQzI5LjUzNDIgNi42ODIzMiAyOS40NzQxIDUuOTg5MzUgMjkuMzk4MiA1LjI5Nzk1QzI5LjU1NzMgNS40MDgzNCAyOS43MTMzIDUuNTIyNzkgMjkuODY1OSA1LjY0MTkzQzMwLjMzNTggNS45NzM3MiAzMC42NTE0IDYuMTU5MTYgMzEuMTgzMyA2LjM2MjQyQzMxLjI1MzggNi44MTQ2IDMxLjI4ODYgNy40MjY1NyAzMS4zMjQ0IDcuODg3MkMzMS40MTEyIDkuMDE2NCAzMS40NzExIDEwLjE0NzUgMzEuNTA0MSAxMS4yNzk1QzMxLjM0NDMgMTEuMzMxMSAzMS4xNTMxIDExLjQyMDUgMzAuOTk2MSAxMS40ODg3QzMwLjg1NTUgMTEuNDMyNCAzMC43Mjk0IDExLjM3NTggMzAuNTgwNCAxMS4zNDY0QzMwLjQ1NTggMTEuMzg3MSAzMC4zNjg1IDExLjU4MTYgMzAuMzMzNyAxMS43MDA0QzI5LjcwMjkgMTMuODU2OCAyOS44NTM2IDE2LjQwNzYgMjkuOTEzNCAxOC42NDI2QzI5LjAzNzkgMTguNTU2IDI3LjMwNTQgMTguNTg4OCAyNi40MTI1IDE4LjU4ODVDMjMuNzk2OSAxOC41NzgyIDIxLjE4MTUgMTguNjM2IDE4LjU2ODggMTguNzYxN0wxOC41NCAxNS4wODA1QzE4LjUyODIgMTQuMjEyMSAxOC41NDk2IDEzLjIyNjQgMTguMzY0OCAxMi4zNzk2QzE4LjI1OTQgMTEuODk2NSAxOC4wMzc1IDExLjgyMzYgMTcuNjI5MiAxMS41ODU2WiIgZmlsbD0iI0RENDNBMiIvPg0KPHBhdGggZD0iTTE4LjMxMjcgMTAuNDA1QzE4LjMwOTMgMTAuMzgxOSAxOC4zMDY0IDEwLjM1ODQgMTguMzAzOCAxMC4zMzUzQzE4LjI4MjEgMTAuMTQyMyAxOC4zODk4IDkuOTM2ODggMTguNTExMiA5LjgwNDI5QzE5LjQxOTkgOC44MTAxOCAyMS44Mjc5IDguNDI2NDkgMjMuMDQ5OSA4LjMwNzk3QzI1LjIyNDkgOC4wOTY4OSAyOC43MjQ4IDguMTc5MTMgMzAuNDY3OSA5LjYxMTY2QzMwLjM3ODcgMTAuMTQyIDMwLjE5MTIgMTAuNjUyNyAzMC4wMTI4IDExLjE1ODNDMjkuNzg1MSAxMS44MDU2IDI5LjUxMiAxMi40MzYxIDI5LjE5NTUgMTMuMDQ0OUMyNi41NTM5IDEyLjEwOCAyMS44NTk0IDEyLjIwNjggMTkuMjEzNCAxMy4xNzE5QzE4LjgxOTMgMTIuMzc4MiAxOC41MDE5IDExLjI2MjIgMTguMzEyNyAxMC40MDVaIiBmaWxsPSIjOTIxOTcyIi8+DQo8cGF0aCBkPSJNMTguNzUyNiAxMC42MzgzQzE4Ljc1MTMgMTAuNjI1NSAxOC43NDEyIDEwLjUyMzkgMTguNzQzOCAxMC41MTQ1QzE5LjEzOTcgOS4wNzU0MSAyMy41NjQgOC44Njg3MSAyNC4yNTQ4IDguODYxMkMyNC4zODAyIDkuNDc3MjQgMjQuNTM4OCA5LjU2Njk5IDI1LjEzNjcgOS42MjQ1M0MyNS4wOTkyIDkuODQxMjQgMjUuMDYwMiAxMC4wNTc2IDI1LjAxOTcgMTAuMjc0QzI0Ljk1MjUgMTAuNjYyNCAyNC44NzkzIDExLjA1ODMgMjQuODI4NSAxMS40NDg2QzIzLjA1ODYgMTEuNDY1OCAyMC45MjY0IDExLjc0ODEgMTkuMjM3NCAxMi4yNjMyQzE5LjA3MTUgMTEuNzY2OSAxOC44NTAxIDExLjE0MTggMTguNzUyNiAxMC42MzgzWiIgZmlsbD0iI0IwMjY4OSIvPg0KPHBhdGggZD0iTTE0Ljk3MjYgMTQuMzcxMUMxNC45NDI0IDE0LjE0NTMgMTQuOTYzOCAxMy41OTAyIDE0Ljk4NzkgMTMuMzU5NEMxNS4wMzQgMTIuOTE5NSAxNS4xNDEyIDEyLjMxMzQgMTUuNTExNiAxMi4wMjk1QzE1LjgzNzQgMTEuNzc5NiAxNi4xMTM4IDExLjgzNjIgMTYuNDgwNiAxMS44ODI1QzE2LjAzNjEgMTIuMzY0NCAxNS40MjQyIDEzLjEyMjQgMTUuNTg2MSAxMy44MTZDMTUuODM1NSAxNC4yNDgyIDE2LjIwNjggMTQuMTYzNCAxNi42MTYzIDE0LjA5NzhDMTYuNjE0NSAxNC41MDc0IDE2LjY3NTUgMTUuNjI4MiAxNi41Njc1IDE2LjA1MDlDMTYuNTQ0MyAxNi4xNDE5IDE2LjE2OCAxNi4yMjM2IDE2LjAzOTMgMTYuMjM0OEMxNS44NjMyIDE2LjI1MDEgMTUuNjg4NCAxNi4xOTQyIDE1LjU1MzggMTYuMDc5N0MxNS4xMTAyIDE1LjcwNzYgMTUuMDIyMiAxNC45MTY0IDE0Ljk3MjYgMTQuMzcxMVoiIGZpbGw9IiNERDQzQTIiLz4NCjxwYXRoIGQ9Ik0zMi40NTkzIDE1LjM4OTdMMzIuNDU0MyAxMy45ODY5QzMyLjY4MDggMTMuOTk0NyAzMy4wMDgxIDE0LjAyMDYgMzMuMTg1MSAxMy44NjkzQzMzLjc3MDYgMTMuMzY4MyAzMi45NTI1IDEyLjMwMjYgMzIuNjM2IDExLjg5NjdDMzMuMTc2OSAxMS44NTk4IDMzLjMxMjkgMTEuOTMzIDMzLjYzNCAxMi4zNjA4QzM0LjAzODcgMTMuMTY3NiAzNC4wNDA3IDE0LjUwMzUgMzMuODAxMiAxNS4zNjVDMzMuNjg0NiAxNS43ODQgMzMuNTI2OCAxNi4wNTU4IDMzLjE1MDIgMTYuMjY3MUMzMy4wNjYzIDE2LjI3MDYgMzIuOTgyNCAxNi4yNzI1IDMyLjg5ODUgMTYuMjcyNUMzMi4zNDgxIDE2LjI2ODEgMzIuNDU0IDE1Ljc5MDkgMzIuNDU5MyAxNS4zODk3WiIgZmlsbD0iI0RENDNBMiIvPg0KPHBhdGggZD0iTTMwLjM1MTkgMTguNjQ1MUMzMC4zNTcyIDE3Ljk5NjkgMzAuMjE1MSAxMi40MjEzIDMwLjczODMgMTIuMTk5NkMzMC44MTczIDEyLjI5NTYgMzAuODMgMTIuNzk0NiAzMC44MjM4IDEyLjkzMjVDMzAuODE0MiAxMy4yODE1IDMwLjY1MjkgMTMuNjc2OCAzMC42NDU1IDE0LjAyMTdDMzAuNjE5OSAxNS4yMDA2IDMwLjUzMjQgMTYuNDk3OCAzMC42MjE5IDE3LjY3MDdMMzAuNjU4MyAxNy43NTc3QzMwLjgxNiAxNy45MDM3IDMxLjMxMDkgMTcuODg3MSAzMS4zMzU1IDE3LjYwMDdDMzEuMzY1IDE3LjI1NyAzMS4zNTQ4IDE2LjkwOSAzMS4zNTM1IDE2LjU2MzdDMzEuMzUxNCAxNS43MzM4IDMxLjM0MDggMTQuOTAzOSAzMS4zMjE2IDE0LjA3NDNDMzEuMzE4NCAxMy45NDEgMzEuMjg5MSAxMy40ODAxIDMxLjMwNzQgMTMuMzg0MUMzMS4zOSAxMy4zNDM4IDMxLjUzNjcgMTMuMzU0NCAzMS42MTIgMTMuNDA3NkMzMS42NTc4IDEzLjYyNTIgMzEuNjU3NyAxNC43ODQ0IDMxLjY1OTEgMTUuMDcyMUwzMS42NjQgMTguNzE1OEMzMS4yNDE5IDE4LjY4MDUgMzAuNzc1IDE4LjY2MDUgMzAuMzUxOSAxOC42NDUxWiIgZmlsbD0iI0RENDNBMiIvPg0KPHBhdGggZD0iTTE3LjYwMTcgMTYuMTMwNEMxNy41ODUgMTUuMjE5NCAxNy41ODg5IDE0LjMwODUgMTcuNjEzNCAxMy4zOTc5QzE3Ljc1NjggMTMuMzgwNyAxNy45MDg1IDEzLjM2OTQgMTguMDUzIDEzLjM1NjZDMTguMDcwMyAxNC4yNDI1IDE4LjA4MTIgMTUuMTI4NyAxOC4wODU3IDE2LjAxNTNDMTguMDg4NSAxNi45Mzc1IDE4LjA5OTMgMTcuODU5MyAxOC4xMTggMTguNzgxNUwxNy42NTQzIDE4LjgxNTlMMTcuNjAxNyAxNi4xMzA0WiIgZmlsbD0iI0RENDNBMiIvPg0KPHBhdGggZD0iTTI5LjI5OSAzLjg5NDQ5TDI5LjI5ODYgMy44NjA0TDI5LjMzMjEgMy44MjkxM0MyOS43MzEzIDMuODA5NDMgMzAuMzQ2NyA0LjAyMzMzIDMwLjY0NzcgNC4yODcyNkMzMS4wNTk4IDQuNjQ4MTIgMzEuMDY2NiA1LjMxMDEzIDMxLjA5ODggNS44MjM2TDMxLjA3MjIgNS44NjUxOUMzMC45MDEgNS44OTIwOSAzMC4xODU2IDUuMzc4MyAzMC4wMjMgNS4yNjE2NkMyOS40ODg2IDQuODc4NTkgMjkuMzc5OCA0LjUxMjQxIDI5LjI5OSAzLjg5NDQ5WiIgZmlsbD0iI0ZFNzNDNyIvPg0KPHBhdGggZD0iTTE4LjIwMTcgNS43NzE5N0MxOC4zMjEyIDQuMzI5NDQgMTguNzY5OSA0LjEwNzQxIDIwLjA4MjMgMy44NjM1QzIwLjAzMjkgNC4wNDg2MiAxOS45ODQyIDQuMjMyMTggMTkuOTEwNSA0LjQwODI0QzE5LjY0MjcgNS4wNDgwNSAxOC44MzY3IDUuNTMzMDYgMTguMjAxNyA1Ljc3MTk3WiIgZmlsbD0iI0ZFNzNDNyIvPg0KPHBhdGggZD0iTTMxLjM5MTMgMTIuNjAxNkMzMS4zODc2IDEyLjU0MjkgMzEuMzcxIDEyLjIzMzYgMzEuMzg0NyAxMi4yMDQ1QzMxLjc1MjcgMTEuNDI2NSAzMi41MzI3IDEyLjE5MzIgMzIuNzYyNyAxMi41NjU0QzMyLjgzMjMgMTIuNzAyMyAzMi45MjUzIDEyLjk2ODUgMzIuOTgzNSAxMy4xMjAxQzMyLjQ5MTEgMTIuOTYzMSAzMi4wMTYgMTIuODQ5NiAzMS41MSAxMi43NDkyQzMxLjQzMiAxMi43MzM5IDMxLjQxNjUgMTIuNjYzNiAzMS4zOTEzIDEyLjYwMTZaIiBmaWxsPSIjREQ0M0EyIi8+DQo8cGF0aCBkPSJNMTYuMDA3NiAxMy4zMDEzQzE2LjE2MDEgMTIuNTgzMyAxNi43MzgzIDExLjkyMjIgMTcuNTIyNCAxMS45NzY5QzE3LjU2MTkgMTIuMDk1NSAxNy41OTg1IDEyLjc2MTIgMTcuNDc1NCAxMi44MTQ3QzE3LjAwMDYgMTMuMDIwOCAxNi40OTczIDEzLjEwMTggMTYuMDA3NiAxMy4zMDEzWiIgZmlsbD0iI0RENDNBMiIvPg0KPC9zdmc+DQo=';

const mapHtmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
    <style>
        :root {
            --leaflet-control-left: 18px;
            --leaflet-control-bottom: 86px;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
        .leaflet-control-container .leaflet-top.leaflet-left {
            top: auto;
            left: var(--leaflet-control-left);
            right: auto;
            bottom: var(--leaflet-control-bottom);
            transition: left 220ms ease, bottom 220ms ease;
        }
        .leaflet-control-container .leaflet-top.leaflet-left .leaflet-control {
            margin-top: 0;
            margin-left: 0;
        }
        .leader-leaflet-icon {
            background: transparent;
            border: none;
        }
        .leader-icon-img {
            width: 32px;
            height: 28px;
            transform-origin: center;
            filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.35));
        }
        #leader-edge-indicator {
            position: absolute;
            z-index: 1000;
            width: 36px;
            height: 32px;
            display: none;
            pointer-events: none;
            transform: translate(-50%, -50%);
        }
        #leader-edge-indicator img {
            width: 100%;
            height: 100%;
            transform-origin: center;
            filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.35));
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div id="leader-edge-indicator"><img src="${LEADER_ICON_URL}" alt="" /></div>
    <script>
        const map = L.map('map').setView([47.2165, -1.550], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Créer une icône personnalisée avec le SVG du CursorVehicule
        const vehicleIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNDciIHZpZXdCb3g9IjAgMCA1MiA0NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjUuNTI4MyAyLjE3Mjg1QzM4LjYxMyAyLjE3Mjk0IDQ4Ljg4MzcgMTEuODM0NCA0OC44ODM4IDIzLjM1NTVDNDguODgzOCAzNC44NzY2IDM4LjYxMzEgNDQuNTM4IDI1LjUyODMgNDQuNTM4MUMxMi40NDM1IDQ0LjUzODEgMi4xNzI4NSAzNC44NzY2IDIuMTcyODUgMjMuMzU1NUMyLjE3MjkgMTEuODM0MyAxMi40NDM1IDIuMTcyODUgMjUuNTI4MyAyLjE3Mjg1WiIgZmlsbD0iI0JCNDg3QyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0LjM0NTIxIi8+PHBhdGggZD0iTTIzLjE5ODUgOS43NTA1OUMyMy45Njk0IDguMDQ5MzggMjYuMzg1NSA4LjA0OTM4IDI3LjE1NjQgOS43NTA1OUwzNy4wODY4IDMxLjY2NkMzOC4wMzU1IDMzLjc1OTcgMzUuNTA3OCAzNS43MDAyIDMzLjczMDMgMzQuMjQyOEwyNS44NjYyIDI3Ljc5NDhDMjUuNDY1NyAyNy40NjY1IDI0Ljg4OTEgMjcuNDY2NSAyNC40ODg3IDI3Ljc5NDhMMTYuNjI0NSAzNC4yNDI4QzE0Ljg0NyAzNS43MDAyIDEyLjMxOTQgMzMuNzU5NyAxMy4yNjgxIDMxLjY2NkwyMy4xOTg1IDkuNzUwNTlaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
            iconSize: [32, 28],
            iconAnchor: [16, 28],
            popupAnchor: [0, -28]
        });
        const leaderIcon = L.divIcon({
            html: '<img class="leader-icon-img" src="${LEADER_ICON_URL}" alt="" />',
            className: 'leader-leaflet-icon',
            iconSize: [32, 28],
            iconAnchor: [16, 28],
            popupAnchor: [0, -28]
        });
        
        const pinSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C15.0376 12 17.5 9.53757 17.5 6.5C17.5 3.46243 15.0376 1 12 1C8.96243 1 6.5 3.46243 6.5 6.5C6.5 9.53757 8.96243 12 12 12ZM12 12V23" stroke="#BB487C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const pinSvgStartEnd = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.155 0.0843026C9.1425 -0.541559 5.04413 2.39304 4.58995 6.37422C3.84251 12.9353 7.9087 15.7413 11.0308 23.2064C11.2275 23.6793 11.7281 24.0722 12.1394 23.9888C12.4326 23.9296 12.776 23.6063 12.9619 23.0534C15.7049 14.8546 19.417 14.4513 19.4993 7.82761C19.5458 3.97856 17.2785 0.72755 13.155 0.0843026ZM11.9069 20.5743L7.75134 13.3352C6.24217 10.8283 5.80587 7.94583 6.73927 5.17465C7.57968 3.24838 9.37138 2.10792 11.349 1.86106C13.4304 1.60376 15.5511 2.36522 16.8314 4.19413C18.3585 7.19827 17.9114 10.7066 16.0089 13.4743C14.4496 15.6891 13.248 17.8205 11.9034 20.5709L11.9069 20.5743Z" fill="#A53075"/><path d="M16.8351 4.19417C15.5548 2.36179 13.4341 1.60032 11.3527 1.8611C9.37506 2.10797 7.58336 3.24843 6.74295 5.17469C5.80955 7.94587 6.24585 10.8283 7.75502 13.3352L11.9106 20.5744C13.2553 17.8241 14.4533 15.6926 16.0161 13.4778C17.9187 10.7101 18.3657 7.20179 16.8387 4.19765L16.8351 4.19417ZM14.2852 9.88256C13.2016 11.2003 11.5244 11.5828 10.2906 11.0022C8.692 10.2511 8.36298 8.52305 9.02101 6.93753C9.80063 5.06343 11.8284 4.38541 13.4305 5.19903C15.2937 6.14825 15.7193 8.14058 14.2852 9.88604V9.88256Z" fill="#D1518B"/><path d="M13.4305 5.19903C11.8284 4.38193 9.79706 5.06343 9.02101 6.93753C8.36298 8.52305 8.692 10.2511 10.2906 11.0022C11.5244 11.5828 13.2016 11.2038 14.2852 9.88256C15.7193 8.1371 15.2936 6.14473 13.4304 5.19551L13.4305 5.19903ZM12.6794 9.02022C12.3361 9.42703 11.3991 9.85123 10.8591 9.30534C10.0544 8.48824 10.6803 6.96531 11.7138 6.58631C12.2467 6.3916 13.0335 6.80884 13.2731 7.39993C13.5735 8.15097 12.9727 8.67252 12.683 9.02022H12.6794Z" fill="#A53075"/></svg>';
        const pinIcon = L.icon({
          iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(pinSvg),
          iconSize: [30, 30],
          iconAnchor: [15, 29],
          popupAnchor: [0, -24]
        });
        const pinStartEndIcon = L.icon({
          iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(pinSvgStartEnd),
          iconSize: [30, 30],
          iconAnchor: [15, 29],
          popupAnchor: [0, -24]
        });

        const userMarker = L.marker([47.2165, -1.550], {
            icon: vehicleIcon,
            title: 'Ma position'
        }).addTo(map);

        const stepsLayer = L.layerGroup().addTo(map);
        const routeLine = L.polyline([], {
          color: '#BB487C',
          weight: 4,
          opacity: 0.9
        }).addTo(map);
        let leaderMarker = null;
        let leaderAnimationFrame = null;
        let leaderLatLng = null;
        let leaderHeading = null;
        const leaderEdgeIndicator = document.getElementById('leader-edge-indicator');
        const leaderEdgeIcon = leaderEdgeIndicator.querySelector('img');

        const normalizeHeading = (heading) => {
            if (heading === null || heading === undefined || heading === '') return null;
            const numericHeading = Number(heading);
            if (!Number.isFinite(numericHeading)) return null;
            return ((numericHeading % 360) + 360) % 360;
        };

        const getLeaderIconElement = () => leaderMarker?.getElement()?.querySelector('.leader-icon-img');

        const applyLeaderHeading = () => {
            const rotation = normalizeHeading(leaderHeading) ?? 0;
            const markerIcon = getLeaderIconElement();
            if (markerIcon) markerIcon.style.transform = 'rotate(' + rotation + 'deg)';
            leaderEdgeIcon.style.transform = 'rotate(' + rotation + 'deg)';
        };

        const updateLeaderEdgeIndicator = () => {
            if (!leaderLatLng) return;

            const bounds = map.getBounds();
            if (bounds.contains(leaderLatLng)) {
                leaderEdgeIndicator.style.display = 'none';
                return;
            }

            const size = map.getSize();
            const point = map.latLngToContainerPoint(leaderLatLng);
            const edgePadding = 20;
            const x = Math.min(Math.max(point.x, edgePadding), size.x - edgePadding);
            const y = Math.min(Math.max(point.y, edgePadding), size.y - edgePadding);

            leaderEdgeIndicator.style.display = 'block';
            leaderEdgeIndicator.style.left = x + 'px';
            leaderEdgeIndicator.style.top = y + 'px';
            applyLeaderHeading();
        };

        const updateLeaderMarker = (latitude, longitude, heading) => {
            leaderLatLng = L.latLng(latitude, longitude);
            leaderHeading = normalizeHeading(heading) ?? leaderHeading;

            if (!leaderMarker) {
                leaderMarker = L.marker(leaderLatLng, {
                    icon: leaderIcon,
                    title: 'Véhicule de tête'
                }).addTo(map);
                applyLeaderHeading();
                updateLeaderEdgeIndicator();
                return;
            }

            if (leaderAnimationFrame) {
                cancelAnimationFrame(leaderAnimationFrame);
            }

            applyLeaderHeading();
            updateLeaderEdgeIndicator();

            const start = leaderMarker.getLatLng();
            const end = L.latLng(latitude, longitude);
            const startTime = performance.now();
            const duration = 900;

            const animate = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                const nextLat = start.lat + (end.lat - start.lat) * progress;
                const nextLng = start.lng + (end.lng - start.lng) * progress;

                leaderMarker.setLatLng([nextLat, nextLng]);

                if (progress < 1) {
                    leaderAnimationFrame = requestAnimationFrame(animate);
                } else {
                    leaderAnimationFrame = null;
                    updateLeaderEdgeIndicator();
                }
            };

            leaderAnimationFrame = requestAnimationFrame(animate);
        };

        const handleNativeMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'SET_LOCATION') {
                    const { latitude, longitude, center = true } = data;
                    userMarker.setLatLng([latitude, longitude]);
                    if (center) {
                        map.setView([latitude, longitude], 13);
                    }
                    console.log('Map updated:', latitude, longitude);
                }
                if (data.type === 'SET_LEADER_LOCATION') {
                    const { latitude, longitude, heading } = data;
                    updateLeaderMarker(latitude, longitude, heading);
                    console.log('Leader updated:', latitude, longitude, heading);
                }
                if (data.type === 'SET_CONTROL_POSITION') {
                    document.documentElement.style.setProperty('--leaflet-control-left', data.left + 'px');
                    document.documentElement.style.setProperty('--leaflet-control-bottom', data.bottom + 'px');
                }
                if (data.type === 'SET_STEPS') {
                  const { steps } = data;
                  stepsLayer.clearLayers();
                  if (Array.isArray(steps) && steps.length > 0) {
                    const bounds = [];
                    steps.forEach((step, index) => {
                      if (typeof step.latitude !== 'number' || typeof step.longitude !== 'number') return;
                      const isEdge = index === 0 || index === steps.length - 1;
                      const marker = L.marker([step.latitude, step.longitude], {
                        icon: isEdge ? pinStartEndIcon : pinIcon
                      });
                      if (step.name) {
                        marker.bindPopup(step.name);
                      }
                      marker.addTo(stepsLayer);
                      bounds.push([step.latitude, step.longitude]);
                    });
                    if (bounds.length > 0) {
                      map.fitBounds(bounds, { padding: [24, 24] });
                    }
                  }
                }
                if (data.type === 'SET_ROUTE') {
                  const { coordinates } = data;
                  routeLine.setLatLngs([]);
                  if (Array.isArray(coordinates) && coordinates.length > 1) {
                    const latLngs = coordinates
                      .map((coord) => Array.isArray(coord) ? [coord[1], coord[0]] : null)
                      .filter((coord) => Array.isArray(coord));
                    if (latLngs.length > 1) {
                      routeLine.setLatLngs(latLngs);
                    }
                  }
                }
            } catch(e) {}
        };

        window.addEventListener('message', handleNativeMessage);
        window.addEventListener('resize', updateLeaderEdgeIndicator);
        document.addEventListener('message', handleNativeMessage);
        map.on('move zoom resize', updateLeaderEdgeIndicator);
    <\/script>
</body>
</html>
`;


type CallStatus = 'idle' | 'live' | 'muted';

export default function ExploreScreen() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [itineraryVisibleHeight, setItineraryVisibleHeight] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const latestUserPositionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useAppTheme();
  const { trip, role } = useAuth();
  const isDark = colorScheme === 'dark';
  const tripId = trip?.trip_id;
  const isOrganizer = role === 'leader';
  const isLandscape = width > height;
  const topBarTop = isLandscape ? Math.max(16, insets.top + 8) : Math.max(40, insets.top + 8);
  const bottomSafeOffset = isLandscape ? Math.max(16, insets.bottom + 12) : Math.max(30, insets.bottom + 16);
  const horizontalSafeOffset = isLandscape ? Math.max(16, insets.right + 16) : 18;
  const leafletControlLeftOffset = isLandscape ? Math.max(16, insets.left + 16) : 18;
  const topBarHorizontalOffset = 15;
  const micButtonSafeOffset = isLandscape ? Math.max(0, insets.right + 16 - topBarHorizontalOffset) : 0;
  const panelHorizontalOffset = isLandscape
    ? Math.max(15, Math.max(insets.left, insets.right) + 16)
    : 15;
  const fallbackItineraryVisibleHeight = Math.ceil(height * ITINERARY_CLOSED_RATIO + insets.bottom);
  const effectiveItineraryVisibleHeight = itineraryVisibleHeight > 0
    ? itineraryVisibleHeight
    : fallbackItineraryVisibleHeight;
  const itineraryClearanceOffset = Math.ceil(effectiveItineraryVisibleHeight + ITINERARY_CONTROL_GAP);
  const micPanelClearanceOffset = isMicActive
    ? bottomSafeOffset + (isLandscape ? 120 : 190)
    : bottomSafeOffset;
  const recenterBottomOffset = Math.max(itineraryClearanceOffset, micPanelClearanceOffset);
  const leafletControlBottomOffset = recenterBottomOffset;
  const recenterBottomAnimated = useRef(new Animated.Value(recenterBottomOffset)).current;

  const syncLeafletControlPosition = useCallback(() => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'SET_CONTROL_POSITION',
        left: leafletControlLeftOffset,
        bottom: leafletControlBottomOffset,
      })
    );
  }, [leafletControlLeftOffset, leafletControlBottomOffset]);

  const handleItinerarySheetChange = useCallback((_index: number, position?: number) => {
    if (typeof position !== 'number' || !Number.isFinite(position)) {
      setItineraryVisibleHeight(0);
      return;
    }

    setItineraryVisibleHeight(Math.max(0, height - position));
  }, [height]);

  useEffect(() => {
    Animated.timing(recenterBottomAnimated, {
      toValue: recenterBottomOffset,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [recenterBottomAnimated, recenterBottomOffset]);

  useEffect(() => {
    setItineraryVisibleHeight(0);
  }, [height, insets.bottom]);

  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    syncLeafletControlPosition();
  }, [syncLeafletControlPosition]);

  useEffect(() => {
    if (!isOrganizer) {
      setIsMicActive(false);
      setCallStatus('idle');
    }
  }, [isOrganizer]);
  const [tripSteps, setTripSteps] = useState<TripStep[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [distanceToStartKm, setDistanceToStartKm] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [guidance, setGuidance] = useState<GuidanceResult | null>(null);
  const [userStreetName, setUserStreetName] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const lastGeocodeLocationRef = useRef<Coordinates | null>(null);
  const geocodeMinMoveMeters = 50;

  useEffect(() => {
    const fetchSteps = async () => {
      if (!trip?.trip_id) {
        setTripSteps([]);
        setRouteGeometry(null);
        return;
      }

      try {
        const data = await fetchTripSteps(trip.trip_id);
        setTripSteps(data);
      } catch (error) {
        console.error('Erreur reseau lors de la recuperation des etapes:', error);
        setTripSteps([]);
      }
    };

    fetchSteps();
  }, [trip?.trip_id]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!trip?.trip_id) {
        setRouteGeometry(null);
        setRouteSummary(null);
        return;
      }

      try {
        const result = await computeTripRoute(trip.trip_id);
        setRouteGeometry(result.geometry);
        setRouteSummary(result.summary);
      } catch (error) {
        console.error('Erreur reseau lors du calcul de l\'itineraire:', error);
        setRouteGeometry(null);
        setRouteSummary(null);
      }
    };

    fetchRoute();
  }, [trip?.trip_id]);

  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;

    const stepsPayload = tripSteps
      .map((step) => ({
        latitude: Number(step.step_latitude),
        longitude: Number(step.step_longitude),
        name: step.step_name ?? undefined,
      }))
      .filter((step) => Number.isFinite(step.latitude) && Number.isFinite(step.longitude));

    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'SET_STEPS',
        steps: stepsPayload,
      })
    );
  }, [tripSteps, isMapReady]);

  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;

    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'SET_ROUTE',
        coordinates: routeGeometry?.coordinates ?? []
      })
    );
  }, [routeGeometry, isMapReady]);

  useEffect(() => {
    if (tripSteps.length === 0) {
      setCurrentStepIndex(0);
    } else if (currentStepIndex >= tripSteps.length) {
      setCurrentStepIndex(tripSteps.length - 1);
    }
  }, [tripSteps, currentStepIndex]);

  useEffect(() => {
    const fetchStreetName = async () => {
      if (!currentLocation) {
        setUserStreetName(null);
        return;
      }

      const lastGeocodeLocation = lastGeocodeLocationRef.current;
      if (lastGeocodeLocation) {
        const toRadians = (value: number) => (value * Math.PI) / 180;
        const lat1 = toRadians(lastGeocodeLocation.latitude);
        const lat2 = toRadians(currentLocation.latitude);
        const deltaLat = toRadians(currentLocation.latitude - lastGeocodeLocation.latitude);
        const deltaLon = toRadians(currentLocation.longitude - lastGeocodeLocation.longitude);
        const a = Math.sin(deltaLat / 2) ** 2
          + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const meters = 6371000 * c;
        if (meters < geocodeMinMoveMeters) {
          return;
        }
      }

      try {
        const street = await reverseGeocodeStreetName(currentLocation);
        setUserStreetName(street);
        lastGeocodeLocationRef.current = currentLocation;
      } catch (error) {
        console.error('Erreur reseau reverse geocode:', error);
        setUserStreetName(null);
      }
    };

    fetchStreetName();
  }, [currentLocation]);

  useEffect(() => {
    const fetchDistanceToStart = async () => {
      try {
        const distance = await computeDistanceToStart(currentLocation, tripSteps);
        setDistanceToStartKm(distance);
      } catch (error) {
        console.error('Erreur reseau OSRM distance:', error);
        setDistanceToStartKm(null);
      }
    };

    fetchDistanceToStart();
  }, [currentLocation, tripSteps]);

  useEffect(() => {
    const updateGuidance = async () => {
      if (!currentLocation || tripSteps.length === 0) {
        setGuidance(null);
        return;
      }

      const targetIndex = Math.min(currentStepIndex + 1, tripSteps.length - 1);
      const target = tripSteps[targetIndex];
      if (!target) {
        setGuidance(null);
        return;
      }

      const targetCoords = {
        latitude: Number(target.step_latitude),
        longitude: Number(target.step_longitude)
      };

      if (!Number.isFinite(targetCoords.latitude) || !Number.isFinite(targetCoords.longitude)) {
        setGuidance(null);
        return;
      }

      try {
        const result = await computeGuidance(currentLocation, targetCoords);
        setGuidance(result);

        if (typeof result.distanceToTargetMeters === 'number' && result.distanceToTargetMeters <= 50) {
          setCurrentStepIndex((prev) => Math.min(prev + 1, tripSteps.length - 1));
        }
      } catch (error) {
        console.error('Erreur reseau OSRM guidance:', error);
        setGuidance(null);
      }
    };

    updateGuidance();
  }, [currentLocation, tripSteps, currentStepIndex]);

  // Récupérer la position actuelle au chargement
  useEffect(() => {
    let latestLeaderPosition: { latitude: number; longitude: number } | null = null;
    let lastHeadingSentAt = 0;

    const sendLeaderTelemetry = async (latitude: number, longitude: number, heading?: number | null) => {
      if (role !== 'leader' || !tripId) return;

      try {
        const normalizedHeading =
          typeof heading === 'number' && Number.isFinite(heading) && heading >= 0
            ? heading % 360
            : undefined;

        await fetch(`${API_BASE_URL}/api/trips/${tripId}/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude,
            longitude,
            heading: normalizedHeading,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la position leader:', error);
      }
    };

    const initializePosition = async () => {
      try {
        // Attendre 1.5 secondes pour laisser le GPS se stabiliser
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const location = await getLocation();
        if (location && webViewRef.current) {
          latestUserPositionRef.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          latestLeaderPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          // Envoyer la position à la carte Leaflet
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'SET_LOCATION',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              center: true,
            })
          );
          await sendLeaderTelemetry(location.coords.latitude, location.coords.longitude, location.coords.heading);
        }

        // Démarrer le suivi continu pour mettre à jour la position en temps réel
        await startTracking((latitude, longitude, heading) => {
          latestUserPositionRef.current = { latitude, longitude };
          latestLeaderPosition = { latitude, longitude };

          setCurrentLocation({ latitude, longitude });
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'SET_LOCATION',
                latitude,
                longitude,
                center: false,
              })
            );
          }
          sendLeaderTelemetry(latitude, longitude, heading);
        });

        if (role === 'leader' && tripId) {
          await startHeadingTracking((heading) => {
            if (!latestLeaderPosition) return;

            const now = Date.now();
            if (now - lastHeadingSentAt < 1000) return;
            lastHeadingSentAt = now;

            sendLeaderTelemetry(
              latestLeaderPosition.latitude,
              latestLeaderPosition.longitude,
              heading
            );
          });
        }
      } catch (error) {
        console.error('Erreur lors du positionnement du curseur:', error);
      }
    };

    initializePosition();

    // Nettoyage au déchargement
    return () => {
      stopTracking();
    };
  }, [role, tripId]);

  useEffect(() => {
    if (role !== 'participant' || !tripId) return;

    let isFetchingLeaderPosition = false;

    const fetchLeaderPosition = async () => {
      if (isFetchingLeaderPosition) return;
      isFetchingLeaderPosition = true;

      try {
        const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/telemetry/latest`);
        if (response.status === 404) return;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const position = await response.json();
        if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) return;

        webViewRef.current?.postMessage(
          JSON.stringify({
            type: 'SET_LEADER_LOCATION',
            latitude: position.latitude,
            longitude: position.longitude,
            timestamp: position.timestamp,
            heading: position.heading,
          })
        );
      } catch (error) {
        console.error('Erreur lors de la récupération de la position leader:', error);
      } finally {
        isFetchingLeaderPosition = false;
      }
    };

    fetchLeaderPosition();
    const intervalId = setInterval(fetchLeaderPosition, 5000);

    return () => clearInterval(intervalId);
  }, [role, tripId]);

  const handleMicPress = () => {
    setIsMicActive((prev: boolean) => {
      const next = !prev;
      if (!next) {
        setCallStatus('idle');
      }
      return next;
    });
  };

  const handleCallToggle = () => {
    setCallStatus((prev) => {
      if (prev === 'idle') {
        return 'live';
      }

      if (prev === 'live') {
        return 'muted';
      }

      return 'live';
    });
  };

  const handleRecenterPosition = async () => {
    let position = latestUserPositionRef.current;

    if (!position) {
      const location = await getLocation();
      position = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      latestUserPositionRef.current = position;
    }

    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'SET_LOCATION',
        latitude: position.latitude,
        longitude: position.longitude,
        center: true,
      })
    );
  };

  const statusContent = {
    idle: {
      status: 'MICRO INACTIF',
      label: "Appuie sur le micro pour lancer l'appel.",
    },
    live: {
      status: 'MICRO OUVERT',
      label: 'Les participants peuvent vous entendre.',
    },
    muted: {
      status: 'MICRO COUPE',
      label: 'On ne vous entend plus.',
    },
  }[callStatus];

  const RoundMicIcon = callStatus === 'muted' ? MicMutedIcon : MicIcon;
  const isCallLive = callStatus === 'live';

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtmlContent }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => { setIsMapReady(true); syncLeafletControlPosition(); }}
      />

      <View
        style={[
          styles.topBar,
          {
            top: topBarTop,
            left: topBarHorizontalOffset,
            right: topBarHorizontalOffset,
          },
        ]}>
        <View style={styles.topBarSide}>
          <HomeButton />
        </View>

        <View style={styles.topBarCenter}>
          <ConvoyName />
        </View>

        <View style={[styles.topBarSide, { transform: [{ translateX: -micButtonSafeOffset }] }]}>
          {isOrganizer && <MicButton isActive={isMicActive} onPress={handleMicPress} />}
        </View>
      </View>

      <ScrollUpItinerary
        speedKmh={trip?.trip_speed}
        distanceKm={routeSummary?.distanceKm}
        durationSeconds={routeSummary?.durationSeconds}
        distanceToStartKm={distanceToStartKm}
        distanceToNextTargetMeters={guidance?.distanceToTargetMeters ?? null}
        distanceToNextManeuverMeters={guidance?.distanceToNextManeuverMeters ?? null}
        nextInstruction={guidance?.instruction ?? null}
        streetName={userStreetName}
        onSheetChange={handleItinerarySheetChange}
      />


      <Animated.View
        style={[
          styles.recenterButtonPosition,
          { bottom: recenterBottomAnimated, right: horizontalSafeOffset },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recentrer ma position"
          style={({ pressed }) => [
            styles.recenterButton,
            pressed && styles.recenterButtonPressed,
          ]}
          onPress={handleRecenterPosition}>
          <MaterialIcons name="my-location" size={24} color="#BB487C" />
        </Pressable>
      </Animated.View>

      {isOrganizer && isMicActive && (
        <View
          style={[
            styles.micPanel,
            {
              bottom: bottomSafeOffset,
              left: panelHorizontalOffset,
              right: panelHorizontalOffset,
              backgroundColor: isDark ? 'rgba(28,28,30,0.96)' : 'rgba(255,255,255,0.96)',
            },
          ]}>
          <View
            style={[
              styles.roundMicButtonOuter,
              { borderColor: MIC_STATUS_COLORS[callStatus] },
            ]}>
            <Pressable
              style={[styles.roundMicButton, isCallLive && styles.roundMicButtonActive]}
              onPress={handleCallToggle}>
              <RoundMicIcon
                width={28}
                height={28}
                color={isCallLive ? '#FFFFFF' : '#BB487C'}
              />
            </Pressable>
          </View>

          <View style={styles.statusColumn}>
            <View style={styles.statusRow}>
              <Text style={styles.statusMic}>{statusContent.status}</Text>
            </View>
            <Text style={styles.confirmationText}>{statusContent.label}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  cursorVehicule: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topBarSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  recenterButtonPosition: {
    position: 'absolute',
    right: 18,
    bottom: 60,
    zIndex: 1,
  },
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: '#BB487C',
    elevation: 1,
  },
  recenterButtonWithMicPanel: {
    bottom: 220,
  },
  recenterButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  micPanel: {
    position: 'absolute',
    bottom: 30,
    left: 15,
    right: 15,
    zIndex: 9,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#BB487C',
    padding: 16,
    gap: 12,
  },
  statusColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMic: {
    color: '#BB487C',
    fontSize: 14,
    fontWeight: '600',
  },
  roundMicButtonOuter: {
    alignSelf: 'center',
    padding: 4,
    borderRadius: 999,
    borderWidth: 6,
  },
  roundMicButton: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 72,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#BB487C',
    elevation: 4,
  },
  roundMicButtonActive: {
    backgroundColor: '#BB487C',
    borderColor: '#FFFFFF',
  },
  confirmationText: {
    color: '#BB487C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
