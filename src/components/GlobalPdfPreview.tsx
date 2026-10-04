import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePdfStore } from '../store/usePdfStore';
import { Colors } from '../theme';

/**
 * Preview-only: enlarge type for phone readability, then scale the page
 * to the WebView width (no horizontal scroll). PDF download uses the
 * print-first HTML as-is and is not affected by this script.
 *
 * Do NOT zero out .container min-height — invoices use A4 fill height so
 * the items↔Total spacer (filler row) can expand. Collapsing it makes
 * the preview look congested vs the printed PDF.
 */
const PREVIEW_FIT_SCRIPT = `
(function() {
  function applyFit() {
    try {
      if (false) {
        // Disabled font boost to match downloaded PDF exact styling
      }

      var page = document.getElementById('pdf-page') || document.body;
      if (!page) return;

      page.style.transform = 'none';
      page.style.transformOrigin = 'top left';
      page.style.margin = '0';
      page.style.boxSizing = 'border-box';
      page.style.width = '794px';
      page.style.maxWidth = '794px';

      var pageWidth = Math.max(page.scrollWidth, page.offsetWidth, 1);
      var viewWidth = window.innerWidth || document.documentElement.clientWidth || 1;
      var scale = viewWidth / pageWidth;
      if (scale > 1) scale = 1;

      page.style.transform = 'scale(' + scale + ')';

      var height = Math.ceil(page.scrollHeight * scale);
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflowX = 'hidden';
      document.body.style.width = viewWidth + 'px';
      document.body.style.height = height + 'px';
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.width = viewWidth + 'px';
      document.documentElement.style.height = height + 'px';
    } catch (e) {}
  }

  applyFit();
  window.addEventListener('resize', applyFit);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(applyFit);
  }
  setTimeout(applyFit, 50);
  setTimeout(applyFit, 250);
  true;
})();
`;

export const GlobalPdfPreview = () => {
  const { isVisible, htmlContent, closePreview } = usePdfStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const webRef = useRef<WebView>(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // 1. Set base64 to TRUE to pull the raw PDF data directly into memory!
      const { base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare && base64) {
        // 2. Define a safe path in your app's own Document Directory
        const fileName = 'invoice_' + Date.now() + '.pdf';
        const newUri = FileSystem.documentDirectory + fileName;
        
        // 3. Dump the Base64 data directly to the new file, bypassing Android's locked cache!
        await FileSystem.writeAsStringAsync(newUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 4. Share the file (which your app completely owns and can read safely)
        await Sharing.shareAsync(newUri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf', 
          dialogTitle: 'Share Document' 
        });
      } else {
        // Fallback for devices that don't support sharing
        const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
        await Print.printAsync({ uri });
      }
    } catch (error) {
      console.error("Failed to generate or share PDF", error);
      Alert.alert("Error", "Failed to generate or share PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closePreview}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={closePreview}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Preview</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={htmlContent}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF Preview"
              onLoad={(e) => {
                const iframe = e.currentTarget;
                const doc = iframe.contentDocument;
                if (!doc) return;
                const script = doc.createElement('script');
                script.textContent = PREVIEW_FIT_SCRIPT;
                doc.body.appendChild(script);
              }}
            />
          ) : (
            <WebView
              ref={webRef}
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              style={styles.webview}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={false}
              bounces={false}
              scalesPageToFit={false}
              setBuiltInZoomControls={true}
              setDisplayZoomControls={false}
              injectedJavaScript={PREVIEW_FIT_SCRIPT}
              onLoadEnd={() => {
                webRef.current?.injectJavaScript(PREVIEW_FIT_SCRIPT);
              }}
              javaScriptEnabled={true}
              automaticallyAdjustContentInsets={false}
              scrollEnabled={true}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.downloadBtn} 
            onPress={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="download" size={24} color="white" />
                <Text style={styles.downloadText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderTopWidth: 3,
    borderTopColor: Colors.primaryLight,
    elevation: 3,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.purple100,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.gray100,
    padding: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  footer: {
    backgroundColor: Colors.surface,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  downloadBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
