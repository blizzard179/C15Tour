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

// Contenu du bottom sheet de l'écran de connexion : un en-tête toujours visible
// (LoginHeader) et un corps (LoginBody, formulaires de connexion) qui s'estompe
// et glisse légèrement quand le panneau se replie, pour une transition plus douce.
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
