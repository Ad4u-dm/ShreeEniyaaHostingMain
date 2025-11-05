"use client";

// ShadCn
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Components
import {
  PdfViewer,
  BaseButton,
  NewInvoiceAlert,
  InvoiceLoaderModal,
  InvoiceExportModal,
} from "@/app/components";

// Contexts
import { useInvoiceContext } from "@/contexts/InvoiceContext";
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { FileInput, FolderUp, Import, Plus, RotateCcw } from "lucide-react";

const InvoiceActions = () => {
  const { invoicePdfLoading, newInvoice } = useInvoiceContext();

  const { _t } = useTranslationContext();
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-sm sticky top-24 card-hover">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-success to-info flex items-center justify-center shadow-lg">
              <span className="text-success-foreground font-bold text-lg">⚡</span>
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{_t("actions.title")}</CardTitle>
              <CardDescription className="text-sm mt-1">{_t("actions.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="grid gap-3">
            {/* Load modal button */}
            <InvoiceLoaderModal>
              <BaseButton
                variant="outline"
                tooltipLabel="Open load invoice menu"
                disabled={invoicePdfLoading}
                className="w-full justify-start gap-2 h-11 button-hover"
              >
                <FolderUp className="h-4 w-4" />
                {_t("actions.loadInvoice")}
              </BaseButton>
            </InvoiceLoaderModal>

            {/* Export modal button */}
            <InvoiceExportModal>
              <BaseButton
                variant="outline"
                tooltipLabel="Open load invoice menu"
                disabled={invoicePdfLoading}
                className="w-full justify-start gap-2 h-11 button-hover"
              >
                <Import className="h-4 w-4" />
                {_t("actions.exportInvoice")}
              </BaseButton>
            </InvoiceExportModal>
          </div>

          <div className="grid gap-3">
            {/* New invoice button */}
            <NewInvoiceAlert>
              <BaseButton
                variant="outline"
                tooltipLabel="Get a new invoice form"
                disabled={invoicePdfLoading}
                className="w-full justify-start gap-2 h-11 button-hover"
              >
                <Plus className="h-4 w-4" />
                {_t("actions.newInvoice")}
              </BaseButton>
            </NewInvoiceAlert>

            {/* Reset form button */}
            <NewInvoiceAlert
              title="Reset form?"
              description="This will clear all fields and the saved draft."
              confirmLabel="Reset"
              onConfirm={newInvoice}
            >
              <BaseButton
                variant="destructive"
                tooltipLabel="Reset entire form"
                disabled={invoicePdfLoading}
                className="w-full justify-start gap-2 h-11 button-hover"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Form
              </BaseButton>
            </NewInvoiceAlert>

            {/* Generate pdf button */}
            <BaseButton
              type="submit"
              tooltipLabel="Generate your invoice"
              loading={invoicePdfLoading}
              loadingText="Generating your invoice"
              className="w-full justify-center gap-2 h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg button-hover"
            >
              <FileInput className="h-4 w-4" />
              {_t("actions.generatePdf")}
            </BaseButton>
          </div>

          <div className="pt-6 border-t border-border/50">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Live Preview:</h3>
              <p className="text-sm text-muted-foreground">See your invoice update in real-time</p>
            </div>
            {/* Live preview and Final pdf */}
            <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg p-4 border border-border/30">
              <PdfViewer />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InvoiceActions;
