import { calculateLayout } from '../ai/layout.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Auto-layout controller for organizing board objects
 */
export const autoLayout = async (req, res, next) => {
    try {
        const { objects, strategy = 'smart' } = req.body;

        if (!objects || !Array.isArray(objects)) {
            throw new AppError('Objects array is required', 400);
        }

        if (objects.length === 0) {
            return res.json({
                success: true,
                data: { objects: [] }
            });
        }

        // Validate object structure
        const validObjects = objects.every(obj =>
            obj.id && typeof obj.x === 'number' && typeof obj.y === 'number'
        );

        if (!validObjects) {
            throw new AppError('Invalid object structure. Each object must have id, x, y', 400);
        }

        // Calculate new layout
        const layoutedObjects = await calculateLayout(objects, strategy);

        res.json({
            success: true,
            data: {
                objects: layoutedObjects,
                strategy: strategy
            }
        });

    } catch (error) {
        next(error);
    }
};
