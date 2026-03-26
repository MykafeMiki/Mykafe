'use client'

import { useTranslations } from 'next-intl'
import { EnterNameStep } from '@/components/menu/steps/EnterNameStep'
import { ChoiceStep } from '@/components/menu/steps/ChoiceStep'
import { MergeInputStep } from '@/components/menu/steps/MergeInputStep'
import { JoinGroupStep } from '@/components/menu/steps/JoinGroupStep'
import { BlockedStep } from '@/components/menu/steps/BlockedStep'
import { SectionsStep } from '@/components/menu/steps/SectionsStep'
import { MenuStep } from '@/components/menu/steps/MenuStep'
import { useMenuPageState } from './useMenuPageState'

export default function MenuPage() {
  const tc = useTranslations('common')
  const s = useMenuPageState()

  if (s.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{tc('loading')}</div>
      </div>
    )
  }

  if (s.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{s.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            {tc('retry')}
          </button>
        </div>
      </div>
    )
  }

  if (s.step === 'enter-name') {
    return (
      <EnterNameStep
        tableNumber={s.tableNumber}
        customerName={s.customerName}
        existingCustomers={s.existingCustomers}
        isSelectingExisting={s.isSelectingExisting}
        loadingCustomers={s.loadingCustomers}
        onCustomerNameChange={s.setCustomerName}
        onSubmitName={s.handleSubmitName}
        onSelectExistingCustomer={s.handleSelectExistingCustomer}
        onToggleSelectingExisting={s.setIsSelectingExisting}
      />
    )
  }

  if (s.step === 'choice') {
    return (
      <ChoiceStep
        tableNumber={s.tableNumber}
        customerName={s.customerName}
        onGoBack={() => s.setStep('enter-name')}
        onSingleTable={s.handleSingleTable}
        onMergeTables={s.handleMergeTables}
      />
    )
  }

  if (s.step === 'merge-input') {
    return (
      <MergeInputStep
        tableNumber={s.tableNumber}
        mergeInput={s.mergeInput}
        mergeError={s.mergeError}
        creatingSession={s.creatingSession}
        onMergeInputChange={s.setMergeInput}
        onGoBack={() => s.setStep('choice')}
        onConfirmMerge={s.handleConfirmMerge}
      />
    )
  }

  if (s.step === 'join-group' && s.tableSession) {
    return (
      <JoinGroupStep
        tableNumber={s.tableNumber}
        tableSession={s.tableSession}
        onGoBack={() => s.setStep('enter-name')}
        onJoinGroup={s.handleJoinGroup}
        onNotInGroup={s.handleNotInGroup}
      />
    )
  }

  if (s.step === 'blocked') {
    return <BlockedStep tableNumber={s.tableNumber} />
  }

  if (s.step === 'sections') {
    return (
      <SectionsStep
        tableNumber={s.tableNumber}
        filteredCategories={s.filteredCategories}
        isCartOpen={s.isCartOpen}
        orderSuccess={s.orderSuccess}
        estimatedWait={s.estimatedWait}
        onGoBack={() => s.setStep('choice')}
        onSelectSection={s.handleSelectSection}
        onCartOpen={s.setIsCartOpen}
        onOrderSuccess={s.handleOrderSuccess}
      />
    )
  }

  return (
    <MenuStep
      tableNumber={s.tableNumber}
      tableSession={s.tableSession}
      sectionCategories={s.sectionCategories}
      activeCategory={s.activeCategory}
      selectedItem={s.selectedItem}
      isCartOpen={s.isCartOpen}
      orderSuccess={s.orderSuccess}
      estimatedWait={s.estimatedWait}
      onGoBack={s.handleBackToSections}
      onCategorySelect={s.setActiveCategory}
      onAddItem={s.handleAddItem}
      onAddWithModifiers={s.handleAddWithModifiers}
      onSelectItemClose={s.setSelectedItem}
      onCartOpen={s.setIsCartOpen}
      onOrderSuccess={s.handleOrderSuccess}
    />
  )
}
