"use client";

import { useMemo } from "react";

// RHF
import { useFormContext, useWatch } from "react-hook-form";

// ShadCn
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// React Wizard
import { Wizard } from "react-use-wizard";

// Components
import {
    WizardStep,
    BillFromSection,
    BillToSection,
    InvoiceDetails,
    Items,
    PaymentInformation,
    InvoiceSummary,
} from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

const InvoiceForm = () => {
    const { _t } = useTranslationContext();

    const { control } = useFormContext();

    // Get invoice number variable
    const invoiceNumber = useWatch({
        name: "details.invoiceNumber",
        control,
    });

    const invoiceNumberLabel = useMemo(() => {
        if (invoiceNumber) {
            return `#${invoiceNumber}`;
        } else {
            return _t("form.newInvBadge");
        }
    }, [invoiceNumber]);

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-sm card-hover">
                <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                                <span className="text-primary-foreground font-bold text-lg">📄</span>
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                    {_t("form.title")}
                                </CardTitle>
                                <CardDescription className="text-base mt-1">
                                    {_t("form.description")}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge
                            variant="secondary"
                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 shadow-sm"
                        >
                            {invoiceNumberLabel}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-8">
                        <Wizard>
                            <WizardStep>
                                <div className="grid gap-8 md:grid-cols-2">
                                    <BillFromSection />
                                    <BillToSection />
                                </div>
                            </WizardStep>
                            <WizardStep>
                                <div className="space-y-6">
                                    <InvoiceDetails />
                                </div>
                            </WizardStep>

                            <WizardStep>
                                <Items />
                            </WizardStep>

                            <WizardStep>
                                <PaymentInformation />
                            </WizardStep>

                            <WizardStep>
                                <InvoiceSummary />
                            </WizardStep>
                        </Wizard>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default InvoiceForm;
