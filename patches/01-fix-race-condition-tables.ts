/**
 * PATCH: Fix race condition on isHost assignment
 * File: apps/api/src/routes/tables.ts
 * 
 * Sostituire il blocco POST /:id/customers con questo codice
 */

// Add customer to table (with atomic isHost assignment)
router.post('/:id/customers', async (req, res) => {
  try {
    const { tableId } = req.params
    const { name } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Use transaction with serializable isolation to prevent race condition
    const result = await prisma.$transaction(async (tx) => {
      // Lock: count existing active customers
      const existingCount = await tx.tableCustomer.count({
        where: { tableId, isActive: true }
      })

      // First customer is the host
      const isHost = existingCount === 0

      // Create the customer atomically
      const customer = await tx.tableCustomer.create({
        data: {
          tableId,
          name: name.trim(),
          isHost
        }
      })

      // Update table status to OCCUPIED if it was AVAILABLE
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' }
      })

      return customer
    }, {
      isolationLevel: 'Serializable' // Prevents phantom reads
    })

    res.status(201).json(result)
  } catch (error) {
    console.error('Error adding customer to table:', error)
    
    // Handle serialization failure (retry logic could be added here)
    if (error.code === '40001') {
      return res.status(409).json({ 
        error: 'Concurrent modification detected. Please try again.' 
      })
    }
    
    res.status(500).json({ error: 'Failed to add customer' })
  }
})
