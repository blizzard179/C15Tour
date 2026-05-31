import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { StyleSheet } from "react-native";

function LoginHeader() {
    return (
        <ThemedView style={styles.headerContainer}>
            <ThemedText style={styles.headerText} numberOfLines={1} adjustsFontSizeToFit>
                CHARGER UN ITINÉRAIRE
            </ThemedText>
        </ThemedView>
    );
}

export default LoginHeader;

const styles = StyleSheet.create({
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color : '#BB487C',

    },
});
