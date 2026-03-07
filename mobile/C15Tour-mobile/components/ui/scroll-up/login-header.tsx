import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

function LoginHeader() {
    return (
        <ThemedView style={styles.headerContainer}>
            <ThemedText style={styles.headerText}>
                CHARGER UN ITINÉRAIRE
            </ThemedText>
        </ThemedView>
    );
}

export default LoginHeader;

const styles = {
    headerContainer: {
        padding: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color : '#BB487C',

    },
};