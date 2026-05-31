import { ThemedView } from "@/components/themed-view";
import Animated, {
    Extrapolation,
    interpolate,
    type SharedValue,
    useAnimatedStyle,
} from "react-native-reanimated";
import LoginHeader from "./login-header";
import LoginBody from "./login-body";

type ScrollUpProps = {
    collapsed?: boolean;
    animatedPosition: SharedValue<number>;
    expandedSheetPosition: number;
    collapsedSheetPosition: number;
};

function ScrollUp({
    collapsed = false,
    animatedPosition,
    expandedSheetPosition,
    collapsedSheetPosition,
}: ScrollUpProps) {
    const bodyStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            animatedPosition.value,
            [expandedSheetPosition, collapsedSheetPosition],
            [1, 0],
            Extrapolation.CLAMP
        ),
        transform: [
            {
                translateY: interpolate(
                    animatedPosition.value,
                    [expandedSheetPosition, collapsedSheetPosition],
                    [0, 20],
                    Extrapolation.CLAMP
                ),
            },
        ],
    }));

    return (
        <ThemedView>
            <LoginHeader />
            <Animated.View pointerEvents={collapsed ? 'none' : 'auto'} style={bodyStyle}>
                <LoginBody />
            </Animated.View>
        </ThemedView>
    );
}
export default ScrollUp;
