import React, { useMemo, useRef } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../themed-text";
import { useAppTheme } from "@/context/theme";
import SpeedIcon from "../../../../shared/global_assets/pictos/Speed.svg";
import TimeIcon from "../../../../shared/global_assets/pictos/Time.svg";
import FlowerIcon from "../../../../shared/global_assets/pictos/Flower.svg";
import FlagIcon from "../../../../shared/global_assets/pictos/Flag.svg";
import CarIcon from "../../../../shared/global_assets/pictos/Car.svg";

type ScrollUpItineraryProps = {
    speedKmh?: number | string | null;
    distanceKm?: number | string | null;
    durationSeconds?: number | string | null;
    distanceToStartKm?: number | string | null;
    distanceToNextTargetMeters?: number | null;
    distanceToNextManeuverMeters?: number | null;
    nextInstruction?: string | null;
    streetName?: string | null;
    onSheetChange?: (index: number, position?: number) => void;
};

function ScrollUpItinerary({
    speedKmh,
    distanceKm,
    durationSeconds,
    distanceToStartKm,
    distanceToNextTargetMeters,
    distanceToNextManeuverMeters,
    nextInstruction,
    streetName,
    onSheetChange
}: ScrollUpItineraryProps) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['15%'], []);
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useAppTheme();
    const isDark = colorScheme === 'dark';
    const maxDynamicContentSize = Math.round(height * 0.6);

    const speedText = typeof speedKmh === 'number'
        ? (Number.isFinite(speedKmh) ? `${speedKmh} km/h` : 'N/A')
        : (speedKmh?.trim() ? `${speedKmh} km/h` : 'N/A');
    const distanceText = typeof distanceKm === 'number'
        ? (Number.isFinite(distanceKm) ? `${distanceKm} km` : 'N/A')
        : (distanceKm?.trim() ? `${distanceKm} km` : 'N/A');
    const durationValue = typeof durationSeconds === 'number'
        ? durationSeconds
        : (durationSeconds?.trim() ? Number(durationSeconds) : NaN);
    const durationText = Number.isFinite(durationValue)
        ? `${Math.floor(durationValue / 3600)}h ${Math.round((durationValue % 3600) / 60)}min`
        : 'N/A';
    const distanceToNextTargetText = typeof distanceToNextTargetMeters === 'number'
        ? (distanceToNextTargetMeters < 1000
            ? `${Math.round(distanceToNextTargetMeters)} m`
            : `${(distanceToNextTargetMeters / 1000).toFixed(2)} km`)
        : 'N/A';
    const distanceToNextManeuverText = typeof distanceToNextManeuverMeters === 'number'
        ? (distanceToNextManeuverMeters < 1000
            ? `${Math.round(distanceToNextManeuverMeters)} m`
            : `${(distanceToNextManeuverMeters / 1000).toFixed(2)} km`)
        : 'N/A';
    const instructionText = nextInstruction?.trim() ? nextInstruction : 'N/A';
    const distanceToStartText = typeof distanceToStartKm === 'number'
        ? (Number.isFinite(distanceToStartKm) ? `${distanceToStartKm} km` : 'N/A')
        : (distanceToStartKm?.trim() ? `${distanceToStartKm} km` : 'N/A');
    const streetText = streetName?.trim() ? streetName : 'N/A';

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            enableDynamicSizing
            maxDynamicContentSize={maxDynamicContentSize}
            bottomInset={insets.bottom}
            onChange={(index, position) => onSheetChange?.(index, position)}
            onAnimate={(_fromIndex, toIndex, _fromPosition, toPosition) => onSheetChange?.(toIndex, toPosition)}
            containerStyle={styles.sheetContainer}
            backgroundStyle={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}
            handleIndicatorStyle={{ backgroundColor: isDark ? '#555' : '#ccc' }}
        >
            <BottomSheetView style={styles.contentContainer}>
                <View style={styles.bar}>
                    <View style={styles.rowLeft}>
                        <SpeedIcon width={16} height={16} />
                        <ThemedText
                            style={styles.confirmationText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {speedText}
                        </ThemedText>
                    </View>

                    <View style={styles.rowRight}>
                        <TimeIcon width={16} height={16} />
                        <ThemedText
                            style={styles.confirmationText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {durationText}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.bar}>
                    <View style={styles.lineLeft}>
                        <FlowerIcon width={16} height={16} />
                        <ThemedText
                            style={styles.confirmationText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {distanceToStartText}
                        </ThemedText>
                    </View>

                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <CarIcon
                                width={20}
                                height={20}
                                style={{ transform: [{ scaleX: -1 }] }}
                            />
                            <ThemedText style={styles.confirmationText}>...</ThemedText>
                            <FlowerIcon width={16} height={16} />
                        </View>
                        
                        <ThemedText style={styles.confirmationText}>{distanceToNextTargetText}</ThemedText>
                    </View>


                    <View style={styles.lineRight}>
                        <FlagIcon width={16} height={16} />
                        <ThemedText style={styles.confirmationText}>{distanceText}</ThemedText>
                    </View>

                </View>

                <View style={styles.bar}>
                    <View style={styles.centeredInstruction}>
                        <ThemedText style={styles.confirmationText}> 
                            {`Dans ${distanceToNextManeuverText} ${instructionText}`}
                        </ThemedText>
                    </View>
                </View>

                {streetText !== 'N/A' && (
                    <View style={styles.streetPill}>
                        <ThemedText style={styles.streetPillText}>{streetText}</ThemedText>
                    </View>
                )}

            </BottomSheetView>
        </BottomSheet>
    )

}


export default ScrollUpItinerary;

const styles = StyleSheet.create({
    sheetContainer: {
        zIndex: 10,
        elevation: 10,
    },
    contentContainer: {
        padding: 16,
        gap: 8,
    },
    lineLeft: {
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
        maxWidth: '48%',
    },
    lineRight: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        flexShrink: 1,
        maxWidth: '48%',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
        maxWidth: '48%',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        flexShrink: 1,
        maxWidth: '48%',
    },
    centeredInstruction: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    streetPill: {
        alignSelf: 'center',
        borderColor: '#BB487C',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    streetPillText: {
        color: '#BB487C',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    confirmationText: {
        color: '#BB487C',
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
                flexShrink: 1,
  }
});
