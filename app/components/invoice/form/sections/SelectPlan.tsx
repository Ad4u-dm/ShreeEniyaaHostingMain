"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";

// Components
import { Subheading } from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Helpers
import { formatIndianNumber } from "@/lib/helpers";

type Plan = {
    _id: string;
    plan_name: string;
    total_value: number;
    months: number;
    data: Array<{
        month_number: number;
        installment_amount: number;
        dividend: number;
        payable_amount: number;
    }>;
    paymentType?: "onetime" | "monthly";
    selectedMonth?: number;
    invoiceAmount?: number;
};

const SelectPlan = () => {
    const { _t } = useTranslationContext();
    const { setValue, watch } = useFormContext();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentType, setPaymentType] = useState<"onetime" | "monthly">("onetime");
    const [selectedMonth, setSelectedMonth] = useState<number>(1);
    const selectedPlan = watch("details.selectedPlan");

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch('/api/plans');
                if (response.ok) {
                    const data = await response.json();
                    // Map backend fields to frontend expectations
                    const mappedPlans = (data.plans || []).map((plan: any) => ({
                        _id: plan._id,
                        plan_name: plan.planName,
                        total_value: plan.totalAmount,
                        months: plan.duration,
                        data: (plan.monthlyData || []).map((month: any) => ({
                            month_number: month.monthNumber,
                            installment_amount: month.installmentAmount,
                            dividend: month.dividend,
                            payable_amount: month.payableAmount,
                        })),
                        paymentType: plan.planType,
                    }));
                    setPlans(mappedPlans);
                }
            } catch (error) {
                console.error('Failed to fetch plans:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    // Update selected plan when payment type or month changes
    useEffect(() => {
        if (selectedPlan && selectedPlan._id) {
            const currentPlan = plans.find(p => p._id === selectedPlan._id);
            if (currentPlan) {
                handlePlanSelect(currentPlan);
            }
        }
    }, [paymentType, selectedMonth]);

    const handlePlanSelect = (plan: Plan) => {
        const planWithPayment = {
            ...plan,
            paymentType,
            selectedMonth: paymentType === "monthly" ? selectedMonth : undefined,
            invoiceAmount: paymentType === "onetime" 
                ? plan.total_value 
                : plan.data.find(month => month.month_number === selectedMonth)?.payable_amount || 0
        };
        setValue("details.selectedPlan", planWithPayment);
        console.log("Selected plan with payment info:", planWithPayment);
    };

    if (loading) {
        return (
            <section className="flex flex-col gap-5">
                <Subheading>Select Plan:</Subheading>
                <div className="text-center py-8">Loading plans...</div>
            </section>
        );
    }

    return (
        <section className="flex flex-col gap-5">
            <Subheading>Plan Details:</Subheading>

            {/* Payment Type Selection */}
            <div className="p-4 bg-card/50 rounded-lg border backdrop-blur-sm">
                <h4 className="font-semibold mb-3">Invoice Type:</h4>
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="paymentType"
                            value="onetime"
                            checked={paymentType === "onetime"}
                            onChange={(e) => setPaymentType("onetime")}
                            className="text-primary"
                        />
                        <span>One-time Payment (Full Amount)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="paymentType"
                            value="monthly"
                            checked={paymentType === "monthly"}
                            onChange={(e) => setPaymentType("monthly")}
                            className="text-primary"
                        />
                        <span>Monthly Payment</span>
                    </label>
                </div>

                {/* Month Selection for Monthly Payment */}
                {paymentType === "monthly" && (
                    <div className="flex items-center gap-2">
                        <label className="font-medium">Select Month:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="px-3 py-1 rounded border bg-background"
                        >
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((month) => (
                                <option key={month} value={month}>
                                    Month {month}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div
                        key={plan._id}
                        onClick={() => handlePlanSelect(plan)}
                        className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 backdrop-blur-sm ${
                            selectedPlan?._id === plan._id
                                ? "border-primary bg-primary/10 shadow-lg"
                                : "border-border bg-card/50 hover:bg-card/80 hover:border-primary/50"
                        }`}
                    >
                        <h3 className="font-bold text-xl mb-4 text-center">{plan.plan_name}</h3>
                        
                        {/* Plan Overview */}
                        <div className="space-y-2 mb-4 p-3 bg-muted/50 rounded-md">
                            <div className="flex justify-between">
                                <span className="font-medium">Total Value:</span>
                                <span className="font-bold text-primary">
                                    ₹{formatIndianNumber(plan.total_value)} ({plan.total_value.toLocaleString("en-IN")})
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Duration:</span>
                                <span>{plan.months} months</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Monthly Installment:</span>
                                <span>₹{(plan.data[0]?.installment_amount || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <hr className="my-2" />
                            <div className="flex justify-between">
                                <span className="font-medium text-green-600">Invoice Amount:</span>
                                <span className="font-bold text-green-600">
                                    {paymentType === "onetime" 
                                        ? `₹${formatIndianNumber(plan.total_value)}` 
                                        : `₹${formatIndianNumber(plan.data.find(month => month.month_number === selectedMonth)?.payable_amount || 0)}`
                                    }
                                </span>
                            </div>
                            {paymentType === "monthly" && (
                                <div className="text-xs text-muted-foreground">
                                    For Month {selectedMonth}
                                </div>
                            )}
                        </div>

                        {/* Monthly Breakdown */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm mb-2">Monthly Breakdown (First 5 months):</h4>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {plan.data.slice(0, 5).map((monthData) => (
                                    <div key={monthData.month_number} className="flex justify-between text-xs bg-muted/30 p-2 rounded">
                                        <span>Month {monthData.month_number}</span>
                                        <div className="text-right">
                                            <div>Installment: ₹{monthData.installment_amount.toLocaleString("en-IN")}</div>
                                            <div className="text-green-600">Dividend: ₹{monthData.dividend.toLocaleString("en-IN")}</div>
                                            <div className="font-medium">Payable: ₹{monthData.payable_amount.toLocaleString("en-IN")}</div>
                                        </div>
                                    </div>
                                ))}
                                {plan.data.length > 5 && (
                                    <div className="text-xs text-muted-foreground text-center py-1">
                                        ... and {plan.data.length - 5} more months
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SelectPlan;